#!/usr/bin/env bash
#
# ci-rollup-verdict.sh — INFRA-796
#
# The one copy of the attended CI verdict, shared by /b-close Step 3.4 and /b-release 6.3
# (bump PR) and 6.5 (release PR). Run it AFTER `gh pr checks --watch`: --watch can return
# before `CI pass` exists, because that job is created only when its last `needs:`
# dependency completes (~3 s on run 38304156606), and every row visible in that window is
# COMPLETED/SUCCESS.
#
#   ci-rollup-verdict.sh <pr> [timeout-s=2400] [min-ci-runs=1]
#
# min-ci-runs: CI runs that must be present before anything settles. /b-release passes 2 for
# the release PR — its push run usually finished before the PR opened, so right after
# `gh pr create` the rollup can hold that run alone, complete and carrying its `CI pass`.
#
# Polls `statusCheckRollup` and decides from ONE snapshot per poll — the word and the wait
# flag come from the same `gh -q` evaluation (DEBUG-785). Breaks only on a positive match: a
# known word with waiting == false. gh failing, empty or unparseable output is "not yet".
# stdout: one word —  GREEN | RED (settled) · EMPTY (deadline, nothing registered)
#                     · PENDING (deadline, still waiting — never the last word seen)
# stderr: the deciding (or last) snapshot's rows, sorted.
# Exit: 0 GREEN only · 1 anything else.
#
# `.conclusion // .state`: CheckRuns carry `.conclusion`, StatusContexts `.state`.
# GREEN_JQ is B_CLOSE_CI_JQ from app/scripts/b-close-verdict.sh VERBATIM — change both or
# neither. WAIT_JQ is that file's B_CLOSE_CI_WAIT_JQ with one clause widened: not "a
# `CI pass` row exists" but "every CI run has its own `CI pass` row". A release PR carries a
# push run and a pull_request run on one SHA; once the first run's `CI pass` exists, bare
# existence reads settled while the second run's is still unregistered. On a single-run PR
# the two clauses are identical. Widening only ever delays — the green set is untouched.
#
# CI_VERDICT_POLL_S (tests only): seconds between polls, default 20.

if [ -z "${BASH_VERSION:-}" ]; then echo "run with bash" >&2; exit 2; fi

pr="${1:?usage: ci-rollup-verdict.sh <pr> [timeout-s] [min-ci-runs]}"
deadline=$(( $(date +%s) + ${2:-2400} ))
poll_s="${CI_VERDICT_POLL_S:-20}"
min_runs="${3:-1}"
case "$min_runs" in ''|*[!0-9]*) echo "min-ci-runs must be an integer" >&2; exit 2 ;; esac

GREEN_JQ='[.statusCheckRollup[] | (.conclusion // .state)]
| if length == 0 then "EMPTY"
  elif all(. == "SUCCESS" or . == "NEUTRAL" or . == "SKIPPED") then "GREEN"
  else "RED" end'
PENDING_JQ='[.statusCheckRollup[] | (.status // "COMPLETED")] | any(. != "COMPLETED")'
RUN_ID_JQ='((.detailsUrl // "") | capture("/actions/runs/(?<r>[0-9]+)/")? | .r)'
CI_PASS_OWED_JQ="([.statusCheckRollup[] | select(.workflowName == \"CI\") | $RUN_ID_JQ] | unique) as \$runs
  | ([.statusCheckRollup[] | select(.workflowName == \"CI\" and .name == \"CI pass\") | $RUN_ID_JQ] | unique) as \$passed
  | (\$runs | length) < $min_runs or (\$runs | length) == 0 or ((\$runs - \$passed) | length) > 0"
WAIT_JQ="($PENDING_JQ)
  or any(.statusCheckRollup[]; .status == null and (.state == \"PENDING\" or .state == \"EXPECTED\"))
  or ($CI_PASS_OWED_JQ)"
SNAPSHOT_JQ="([($GREEN_JQ), (($WAIT_JQ) | tostring)] | join(\" \")),
  (.statusCheckRollup[] | \"\\(.name // .context)\\t\\(.conclusion // .state)\")"

verdict=PENDING snap='' last=''
while :; do
  snap="$(gh pr view "$pr" --json statusCheckRollup -q "$SNAPSHOT_JQ" 2>/dev/null)" || snap=''
  word='' waiting=''
  read -r word waiting _ <<<"${snap%%$'\n'*}" || true
  case "$word" in
    GREEN|RED) [ "$waiting" = false ] && { verdict="$word"; break; } ;;
  esac
  case "$word" in GREEN|RED|EMPTY) last="$word" ;; esac
  [ "$(date +%s)" -lt "$deadline" ] || break
  sleep "$poll_s"
done
[ "$verdict" = PENDING ] && [ "$last" = EMPTY ] && verdict=EMPTY

case "$snap" in *$'\n'*) printf '%s\n' "${snap#*$'\n'}" | sort >&2 ;; esac
echo "$verdict"
[ "$verdict" = GREEN ]
