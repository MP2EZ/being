#!/usr/bin/env bash
#
# test-ci-rollup-verdict.sh — INFRA-796
#
# Fixture suite for ci-rollup-verdict.sh, the attended CI verdict /b-close Step 3.4 and
# /b-release 6.3/6.5 merge on. A `gh` stub on PATH replays one rollup fixture per case and
# honours `-q` with jq, so every case drives the shipped loop. The case that matters is
# two-runs-second-pass-missing: a release PR's push run already carries a green `CI pass`
# while the pull_request run's has not registered — bare "a CI pass row exists" reads
# that as settled GREEN. /b-close Phase 0 runs it beside the gate-plan fixtures; `.claude/`
# has no CI.
#
# Usage: bash .claude/scripts/test-ci-rollup-verdict.sh [--script <path>]
# Exit:  0 all pass · 1 a case failed · 2 the suite could not run

if [ -z "${BASH_VERSION:-}" ]; then echo "run with bash" >&2; exit 2; fi
command -v jq >/dev/null || { echo "🛑 jq required" >&2; exit 2; }

EXPECTED_CASES=14

SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-rollup-verdict.sh"
[ "${1:-}" = "--script" ] && SCRIPT="$2"
[ -r "$SCRIPT" ] || { echo "🛑 cannot read $SCRIPT" >&2; exit 2; }

ROOT="$(mktemp -d "${TMPDIR:-/tmp}/ci-rollup-verdict-test.XXXXXX")" || exit 2
trap 'rm -rf "$ROOT"' EXIT
mkdir -p "$ROOT/bin"

# gh stub: `gh pr view <pr> --json statusCheckRollup -q <expr>`. Fixture file per call
# count lets a case change the rollup between polls; the last fixture repeats.
cat > "$ROOT/bin/gh" <<'STUB'
#!/usr/bin/env bash
n=$(( $(cat "$GH_STUB_DIR/calls" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$GH_STUB_DIR/calls"
f="$GH_STUB_DIR/rollup.$n.json"
[ -r "$f" ] || f="$(ls "$GH_STUB_DIR"/rollup.*.json | sort -t. -k2 -n | tail -1)"
[ "$(cat "$f")" = "FAIL" ] && { echo "gh: HTTP 502" >&2; exit 1; }
q=''; while [ $# -gt 0 ]; do [ "$1" = "-q" ] && { q="$2"; shift; }; shift; done
jq -r "$q" "$f"
STUB
chmod +x "$ROOT/bin/gh"

U=https://github.com/MP2EZ/being/actions/runs
# row <workflow> <name> <run> <status> <conclusion>
row() { printf '{"__typename":"CheckRun","workflowName":"%s","name":"%s","detailsUrl":"%s/%s/job/1","status":"%s","conclusion":%s}' \
  "$1" "$2" "$U" "$3" "$4" "$([ "$5" = null ] && echo null || echo "\"$5\"")"; }
ctx() { printf '{"__typename":"StatusContext","context":"%s","state":"%s","targetUrl":"https://example.test"}' "$1" "$2"; }
rollup() { local IFS=,; echo "{\"statusCheckRollup\":[$*]}"; }

PASS=0; FAIL=0; CASES=0
# check <name> <expected-word> <fixture>... — fixtures are served on successive polls.
check() {
  local name="$1" want="$2"; shift 2
  CASES=$((CASES + 1))
  local d="$ROOT/case$CASES"; mkdir -p "$d"
  local i=1; for fx in "$@"; do printf '%s\n' "$fx" > "$d/rollup.$i.json"; i=$((i + 1)); done
  local got rc
  got="$(GH_STUB_DIR="$d" PATH="$ROOT/bin:$PATH" CI_VERDICT_POLL_S=0 \
    bash "$SCRIPT" 42 "${TIMEOUT_S:-1}" ${MIN_RUNS:-} 2>/dev/null)"; rc=$?
  local want_rc=1; [ "$want" = GREEN ] && want_rc=0
  if [ "$got" = "$want" ] && [ "$rc" = "$want_rc" ]; then PASS=$((PASS + 1)); echo "  ✓ $name"
  else FAIL=$((FAIL + 1)); echo "  ✗ $name — want $want/rc$want_rc, got '${got}'/rc$rc"; fi
}

DEPS_A="$(row CI 'TypeScript typecheck' 100 COMPLETED SUCCESS),$(row CI 'Unit + integration tests' 100 COMPLETED SUCCESS)"
DEPS_B="$(row CI 'TypeScript typecheck' 200 COMPLETED SUCCESS),$(row CI 'Unit + integration tests' 200 COMPLETED SUCCESS)"
PASS_A="$(row CI 'CI pass' 100 COMPLETED SUCCESS)"
PASS_B="$(row CI 'CI pass' 200 COMPLETED SUCCESS)"
OTHER="$(row 'Legal Site Freshness' 'being.fyi legal content is current' 300 COMPLETED SUCCESS)"

echo "ci-rollup-verdict.sh"
# Settled verdicts
check "one run, CI pass green → GREEN"                 GREEN   "$(rollup "$DEPS_A" "$PASS_A")"
check "two runs, both CI pass green → GREEN"           GREEN   "$(rollup "$DEPS_A" "$PASS_A" "$DEPS_B" "$PASS_B" "$OTHER")"
check "settled red dependency → RED"                   RED     "$(rollup "$(row CI 'TypeScript typecheck' 100 COMPLETED FAILURE)" "$(row CI 'CI pass' 100 COMPLETED FAILURE)")"
# The registration window — every visible row COMPLETED/SUCCESS, a CI pass still owed
check "one run, CI pass not registered → PENDING"      PENDING "$(rollup "$DEPS_A")"
check "two runs, second run's CI pass missing → PENDING" PENDING "$(rollup "$DEPS_A" "$PASS_A" "$DEPS_B" "$OTHER")"
check "no CI workflow rows at all → PENDING"           PENDING "$(rollup "$OTHER")"
# Release PR: the push run finished before the PR opened; the pull_request run is owed
MIN_RUNS=2 check "min 2 runs, only the push run present → PENDING" PENDING "$(rollup "$DEPS_A" "$PASS_A" "$OTHER")"
MIN_RUNS=2 check "min 2 runs, both present and passed → GREEN"     GREEN   "$(rollup "$DEPS_A" "$PASS_A" "$DEPS_B" "$PASS_B")"
# DEBUG-785's other wait clauses
check "a check still IN_PROGRESS → PENDING"            PENDING "$(rollup "$DEPS_A" "$(row CI 'CI pass' 100 IN_PROGRESS null)")"
check "StatusContext still PENDING → PENDING"          PENDING "$(rollup "$DEPS_A" "$PASS_A" "$(ctx 'ext/check' PENDING)")"
# Failure modes: never a verdict from a read that did not happen
check "empty rollup at the deadline → EMPTY"           EMPTY   "$(rollup)"
check "gh failing every poll → PENDING"                PENDING "FAIL"
check "unparseable output → PENDING"                   PENDING '{"statusCheckRollup":"garbage"}'
# Settles on a later poll — the loop keeps reading after a not-yet
TIMEOUT_S=5 check "window then CI pass appears → GREEN" GREEN "$(rollup "$DEPS_A")" "FAIL" "$(rollup "$DEPS_A" "$PASS_A")"

echo "$PASS passed, $FAIL failed ($CASES cases)"
[ "$CASES" = "$EXPECTED_CASES" ] || { echo "🛑 ran $CASES cases, expected $EXPECTED_CASES" >&2; exit 2; }
[ "$FAIL" = 0 ]
