#!/usr/bin/env bash
#
# INFRA-492 — run /b-close's mechanical tail detached, so serialised closes cost wall-clock
# instead of costing a human twice.
#
# WHAT THIS IS, AND WHERE THE SEAM FALLS. `/b-close` is a procedure, not a script, and most
# of it needs judgement: Phase 2.5.1-2.5.3 classify safety-path changes and map them to
# flows, and Phase 4 writes the Notion record. Neither is here. What IS here is Step 2.5.4
# through Step 3.8 — back-merge, precommit, gate build, scoped flows, push, PR, CI wait,
# merge, cleanup — which is mechanical GIVEN the classification, and is also the entire
# 5-35 minute block that holds a session.
#
# THIS SCRIPT IS THE DETACHED THING; IT DETACHES NOTHING ITSELF. Detachment happens once,
# when the skill launches this with nohup. Inside, every child runs in the foreground.
# CLAUDE.md: the safety suite must never be a reap-able background task — a killed run
# takes the XCUITest driver with it, the flow reports `Unknown error` with ConnectException
# only in maestro.log (indistinguishable from a regression), and a kill during clearState
# leaves the app uninstalled.
#
# IT ADDS NO GUARANTEES AND REMOVES NONE. The gate and the suite are invoked through their
# own entry points, so the INFRA-436 simulator lease, the INFRA-463 gate-worktree lease and
# the INFRA-472 pair lease all apply unchanged — serialisation is preserved, this only
# changes who waits. Provenance is likewise untouched: E2E_REQUIRE_CLEAN_PROVENANCE=1 still
# refuses a dirty-tree marker, and exit 3 still means the target moved and completed flows
# are VOID rather than PASS.
#
# EVERY EXIT IS A NAMED VERDICT. Nothing here reports a bare exit code and nothing infers
# success from an absence: `b_close_stage_verdict` types each stage's outcome, only OK
# continues, and the terminal verdict lands in DONE for `b_close_status` to surface.
#
# WHAT IT WILL NOT DO. It never bypasses the gate, never re-runs a red one, and never
# merges on anything but a GREEN rollup read through the shared filter.

set -u -o pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
. "$APP_DIR/scripts/b-close-verdict.sh"

WORKTREE=''; BRANCH=''; ITEM=''; TITLE=''; BODY_FILE=''; FLOWS=''; FULL_SUITE=''; NO_FLOWS=''
while [ $# -gt 0 ]; do
  case "$1" in
    --worktree)   WORKTREE="$2"; shift 2 ;;
    --branch)     BRANCH="$2";   shift 2 ;;
    --item)       ITEM="$2";     shift 2 ;;
    --title)      TITLE="$2";    shift 2 ;;
    --body-file)  BODY_FILE="$2"; shift 2 ;;
    --flows)      FLOWS="$2";    shift 2 ;;
    --full-suite) FULL_SUITE=1;  shift ;;
    # A service-layer-only safety change maps to zero flows (Step 2.5.3) and closes with no
    # sim build at all. Stated explicitly so it can never be confused with "flows omitted".
    --no-flows)   NO_FLOWS=1;    shift ;;
    *) printf 'unknown argument: %s\n' "$1" >&2; exit 64 ;;
  esac
done

for required in WORKTREE BRANCH ITEM TITLE BODY_FILE; do
  [ -n "${!required}" ] || { printf 'missing --%s\n' "$(echo "$required" | tr 'A-Z_' 'a-z-')" >&2; exit 64; }
done
[ -n "$FLOWS$FULL_SUITE$NO_FLOWS" ] || { printf 'specify --flows, --full-suite or --no-flows\n' >&2; exit 64; }

RUN_DIR="$(b_close_run_dir "$ITEM" "$(date +%s)")"
b_close_run_init "$RUN_DIR" "$ITEM" "$BRANCH"
LOG="$RUN_DIR/log"
exec >>"$LOG" 2>&1

say() { printf '\n=== %s === %s\n' "$1" "$(date -u +%H:%M:%SZ)"; }

# One exit point, so no stage can end the run without writing a verdict.
finish() {
  local verdict="$1" stage="$2" detail="${3:-}"
  b_close_done "$RUN_DIR" "$verdict" "$stage" "$detail"
  printf '\nVERDICT %s at stage %s — %s\n' "$verdict" "$stage" "$detail"
  [ "$verdict" = "MERGED" ] && exit 0
  exit 1
}

# Run one stage, type its outcome, and stop the run on anything but OK.
stage() {
  local name="$1"; shift
  b_close_status_write "$RUN_DIR" "$name"
  say "$name"
  "$@"
  local rc=$?
  local verdict; verdict="$(b_close_stage_verdict "$name" "$rc")"
  b_close_mergeable "$verdict" && return 0
  # Name the failing TEST, not just the stage. A precommit log runs to six figures of
  # lines, so a bare "exit 1" is close to the silence AC2 exists to remove: the operator
  # cannot tell a regression from the documented parallel-load flake without grepping it.
  local hint; hint="$(b_close_fail_hint "$LOG")"
  finish "$verdict" "$name" "exit $rc${hint:+ — ${hint}}"
}

cd "$WORKTREE" || finish UNKNOWN_STAGE setup "worktree $WORKTREE unreadable"

# --- Step 3.1 equivalent: gate the tree that actually merges, not the branch tip ---------
# Returns 1 ONLY for a real merge conflict, so CONFLICT never absorbs "the worktree is
# unreadable" — the two have opposite fixes and only one of them is actionable prose.
sync_dev() {
  git fetch origin --quiet || return 2
  git rev-parse --verify --quiet origin/development >/dev/null || return 2
  [ "$(git rev-list --count HEAD..origin/development)" -eq 0 ] && return 0
  git merge origin/development --no-edit || return 1
}
stage sync sync_dev

# `git merge` does not fire the pre-commit hook, so the merged tree is unverified until now.
stage precommit npm --prefix "$WORKTREE/app" run precommit

RUN_FLOWS=0
[ -n "$FLOWS$FULL_SUITE" ] && RUN_FLOWS=1

if [ "$RUN_FLOWS" -eq 1 ]; then
  # --- Step 2.5.4: the gate, with a BOUNDED queue on lease contention -------------------
  # Exit 4 says a peer holds the pair lease; nothing has been learned about this branch. A
  # blocked session had a human to re-run it, so parking was free. A detached run has
  # nobody, so it queues — but bounded, because an unbounded retry is a wedged gate no one
  # is watching. Each attempt rewrites `status`, which is also what keeps the run from
  # ageing into STALE while it legitimately waits.
  attempt=0
  while :; do
    b_close_status_write "$RUN_DIR" "gate:attempt$((attempt + 1))"
    say "gate (attempt $((attempt + 1)) of $((B_CLOSE_LEASE_RETRIES + 1)))"
    npm --prefix "$WORKTREE/app" run e2e:safety:gate
    gate_rc=$?
    gate_verdict="$(b_close_stage_verdict gate "$gate_rc")"
    [ "$gate_verdict" = "OK" ] && break
    if [ "$gate_verdict" = "LEASE_BUSY" ] && [ "$attempt" -lt "$B_CLOSE_LEASE_RETRIES" ]; then
      attempt=$((attempt + 1))
      b_close_status_write "$RUN_DIR" "gate:queued$attempt"
      say "gate slot busy — queueing ${B_CLOSE_LEASE_BACKOFF_S}s (contention, not a regression)"
      sleep "$B_CLOSE_LEASE_BACKOFF_S"
      continue
    fi
    finish "$gate_verdict" gate "exit $gate_rc after $((attempt + 1)) attempt(s)"
  done

  # --- Step 2.5.5: one invocation for the whole scoped set (INFRA-483) ------------------
  # The simulator lease is per PROCESS, so N invocations means N-1 windows in which a peer
  # can install over the target. One invocation also restores INFRA-434's mid-suite
  # substitution watch, which needs more than one flow to have anything to watch.
  export E2E_REQUIRE_CLEAN_PROVENANCE=1
  run_flows() {
    if [ -n "$FULL_SUITE" ]; then
      bash "$WORKTREE/app/scripts/e2e-safety.sh"
    else
      # shellcheck disable=SC2086
      ( cd "$WORKTREE/app" && bash scripts/e2e-safety.sh $FLOWS )
    fi
  }
  stage flows run_flows
else
  say "no sim flows required (service-layer-only safety change)"
fi

# --- Step 3.2 / 3.3 ---------------------------------------------------------------------
stage push git push -u origin "$BRANCH"

# Idempotent, because CI-red re-entry is the common case and /b-close is documented as
# safe to re-run. `gh pr create` errors when one already exists, which would have made a
# relaunch after any red gate report PR_FAILED and strand the branch.
open_pr() {
  if [ -n "$(gh pr list --head "$BRANCH" --state open --json number -q '.[0].number')" ]; then
    echo "reusing the open PR for $BRANCH"
    return 0
  fi
  gh pr create --base development --head "$BRANCH" --title "$TITLE" --body-file "$BODY_FILE"
}
stage pr open_pr

PR_NUMBER="$(gh pr view "$BRANCH" --json number -q '.number' 2>/dev/null || true)"
[ -n "$PR_NUMBER" ] || finish PR_FAILED pr "PR opened but its number could not be read"
printf 'PR #%s\n' "$PR_NUMBER"

# --- Step 3.4: the verdict that decides whether an unattended process merges -------------
# Polled against the full rollup with a deadline. `gh pr checks --watch` is deliberately
# absent: it blocks correctly but its exit status is not the verdict — a commit can carry
# two runs and --watch can exit green having read only one (INFRA-329).
b_close_status_write "$RUN_DIR" ci
say "ci"
CI_DEADLINE=$(( $(date +%s) + B_CLOSE_CI_TIMEOUT_S ))
CI_WORD=TIMEOUT
while [ "$(date +%s)" -lt "$CI_DEADLINE" ]; do
  word="$(gh pr view "$PR_NUMBER" --json statusCheckRollup -q "$B_CLOSE_CI_JQ" 2>/dev/null || true)"
  pending="$(gh pr view "$PR_NUMBER" --json statusCheckRollup -q "$B_CLOSE_CI_PENDING_JQ" 2>/dev/null || echo true)"
  # EMPTY is the registration window, not a verdict: CI's push trigger does not cover
  # feat/fix/chore branches, so the only run is the one `gh pr create` just triggered and
  # it takes seconds to appear. Waiting it out is why TIMEOUT exists as a distinct word.
  if [ -n "$word" ] && [ "$word" != "EMPTY" ] && [ "$pending" = "false" ]; then
    CI_WORD="$word"; break
  fi
  sleep 20
done
gh pr view "$PR_NUMBER" --json statusCheckRollup \
  -q '.statusCheckRollup[] | "\(.name)\t\(.conclusion // .state)"' 2>/dev/null | sort || true

CI_VERDICT="$(b_close_stage_verdict ci "$CI_WORD")"
b_close_mergeable "$CI_VERDICT" || finish "$CI_VERDICT" ci "rollup=$CI_WORD on PR #$PR_NUMBER"

# --- Step 3.5 - 3.7 ---------------------------------------------------------------------
stage merge gh pr merge "$PR_NUMBER" --merge --delete-branch --admin

b_close_status_write "$RUN_DIR" postmerge
say "postmerge"
git -C /Users/max/dev/being/development fetch origin --quiet || true
if ! git -C /Users/max/dev/being/development pull --ff-only origin development; then
  # Not a merge failure — the merge landed. Unexpected local dev commits must be surfaced,
  # never silently absorbed by an auto-rebase.
  finish MERGED_DEV_UNSYNCED postmerge "PR #$PR_NUMBER merged; development worktree needs manual sync"
fi
if git ls-remote origin "refs/heads/$BRANCH" | grep -q .; then
  git push origin --delete "$BRANCH" || true
fi

finish MERGED merge "PR #$PR_NUMBER"
