#!/usr/bin/env bash
#
# test-worktree-teardown.sh — INFRA-693
#
# Fixture suite for worktree-teardown.sh. `list` decides which worktrees b-work offers to
# delete, so every exclusion has a case that would offer the worktree if the guard were
# removed — most of all the fresh-branch case: a branch with no commits of its own is an
# ancestor of origin/development, so ancestry alone reads it as merged (a live batch slice
# had exactly this shape when INFRA-693 was built). /b-close Phase 0 runs it beside the
# gate-plan fixtures; `.claude/` has no CI.
#
# Merged PRs are injected via WT_TEARDOWN_MERGED_FILE (one branch per line), so no case
# calls gh. Removal runs with --no-sweep: the orphan sweep is e2e-sim-clean.sh's, tested there.
#
# Usage: bash .claude/scripts/test-worktree-teardown.sh [--script <path>]
# Exit:  0 all pass · 1 a case failed · 2 the suite could not run

if [ -z "${BASH_VERSION:-}" ]; then echo "run with bash" >&2; exit 2; fi

EXPECTED_CASES=19

SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/worktree-teardown.sh"
[ "${1:-}" = "--script" ] && SCRIPT="$2"
[ -r "$SCRIPT" ] || { echo "🛑 cannot read $SCRIPT" >&2; exit 2; }

ROOT="$(mktemp -d "${TMPDIR:-/tmp}/worktree-teardown-test.XXXXXX")" || exit 2
ROOT="$(cd "$ROOT" && pwd -P)"
trap 'rm -rf "$ROOT"' EXIT
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t

g() { git -C "$REPO" "$@" >/dev/null 2>&1; }
commit_in() { echo "$2" > "$1/$2"; git -C "$1" add "$2" && git -C "$1" commit -qm "$2"; }

# origin with development; the repo under test is a clone, so origin/development exists.
git init -q -b development "$ROOT/origin.git" --bare || exit 2
git clone -q "$ROOT/origin.git" "$ROOT/seed" 2>/dev/null
git -C "$ROOT/seed" checkout -q -b development
printf 'node_modules/\n' > "$ROOT/seed/.gitignore"
git -C "$ROOT/seed" add .gitignore && git -C "$ROOT/seed" commit -qm base
git -C "$ROOT/seed" push -q origin development || exit 2
REPO="$ROOT/repo"
git clone -q "$ROOT/origin.git" "$REPO" || exit 2

# wt <dir> <branch> — a worktree on a new branch cut from origin/development
wt() { g worktree add "$REPO/$1" -b "$2" origin/development || { echo "🛑 fixture $1" >&2; exit 2; }; }
# merge_to_dev <branch> — land the branch on origin/development with a merge commit, as /b-close does
merge_to_dev() {
  git -C "$ROOT/seed" fetch -q "$REPO" "$1:$1" && git -C "$ROOT/seed" merge -q --no-ff "$1" -m "merge $1" \
    && git -C "$ROOT/seed" push -q origin development && g fetch -q origin
}

wt development development-local       # stands in for `development`: in the merged list, so only its name excludes it
wt merged chore/merged;           commit_in "$REPO/merged" a;    merge_to_dev chore/merged
wt ignored chore/ignored;         commit_in "$REPO/ignored" b;   merge_to_dev chore/ignored
mkdir -p "$REPO/ignored/node_modules" && echo x > "$REPO/ignored/node_modules/x"
wt fresh chore/fresh                                                # no commits of its own
wt after chore/after;             commit_in "$REPO/after" c;     merge_to_dev chore/after; commit_in "$REPO/after" c2
wt dirty chore/dirty;             commit_in "$REPO/dirty" d;     merge_to_dev chore/dirty; echo mod >> "$REPO/dirty/d"
wt untracked chore/untracked;     commit_in "$REPO/untracked" e; merge_to_dev chore/untracked; echo n > "$REPO/untracked/notes.md"
wt unmerged chore/unmerged;       commit_in "$REPO/unmerged" f
wt e2e-gate chore/gate;           commit_in "$REPO/e2e-gate" h;  merge_to_dev chore/gate
wt locked chore/locked;           commit_in "$REPO/locked" i;    merge_to_dev chore/locked; g worktree lock "$REPO/locked"
wt current chore/current;         commit_in "$REPO/current" j;   merge_to_dev chore/current
wt .claude/worktrees/app chore/app; commit_in "$REPO/.claude/worktrees/app" k; merge_to_dev chore/app
g worktree add --detach "$REPO/detached" origin/development

MERGED="$ROOT/merged.txt"
printf '%s\n' chore/merged chore/ignored chore/after chore/dirty chore/untracked chore/gate \
  chore/locked chore/current chore/app development-local > "$MERGED"
export WT_TEARDOWN_MERGED_FILE="$MERGED"

PASS=0; FAIL=0; RAN=0
check() { # check <name> <condition-exit-status>
  RAN=$((RAN + 1))
  if [ "$2" -eq 0 ]; then PASS=$((PASS + 1)); else FAIL=$((FAIL + 1)); echo "❌ $1"; fi
}

LIST="$(bash "$SCRIPT" list --repo "$REPO" --exclude "$REPO/current" 2>"$ROOT/list.err")"; RC=$?
check "list exits 0" $RC
OFFERED="$(printf '%s\n' "$LIST" | cut -f1 | sed "s#^$REPO/##" | sort | tr '\n' ' ')"
check "offers exactly merged + ignored (got: $OFFERED)" "$([ "$OFFERED" = "ignored merged " ]; echo $?)"
for d in fresh after dirty untracked unmerged e2e-gate locked current detached development .claude/worktrees/app; do
  printf '%s\n' "$LIST" | cut -f1 | grep -qx "$REPO/$d"
  check "never offers $d" "$([ $? -ne 0 ]; echo $?)"
done
check "rows carry branch, size and age" \
  "$(printf '%s\n' "$LIST" | awk -F'\t' '$1 ~ /merged$/ && $2=="chore/merged" && $3!="" && $4!=""' | grep -q .; echo $?)"

WT_TEARDOWN_MERGED_FILE="$ROOT/missing" bash "$SCRIPT" list --repo "$REPO" >/dev/null 2>&1
check "list exits 2 when the merged-PR lookup fails" "$([ $? -eq 2 ]; echo $?)"

bash "$SCRIPT" remove --repo "$REPO" --require-clean --no-sweep "$REPO/dirty" >/dev/null 2>&1; RC=$?
check "remove --require-clean refuses a dirty worktree and keeps it" "$([ $RC -ne 0 ] && [ -f "$REPO/dirty/d" ]; echo $?)"

bash "$SCRIPT" remove --repo "$REPO" --no-sweep "$REPO/development" >/dev/null 2>&1; RC=$?
check "remove refuses development" "$([ $RC -ne 0 ] && [ -d "$REPO/development" ]; echo $?)"

bash "$SCRIPT" remove --repo "$REPO" --require-clean --no-sweep "$REPO/ignored" >"$ROOT/rm.out" 2>&1; RC=$?
check "remove deletes a clean worktree with ignored files and unregisters it" \
  "$([ $RC -eq 0 ] && [ ! -e "$REPO/ignored" ] && ! git -C "$REPO" worktree list | grep -q "$REPO/ignored "; echo $?)"

bash "$SCRIPT" remove --repo "$REPO" --no-sweep "$REPO/ignored" >/dev/null 2>&1
check "remove of an already-gone worktree is not a failure" $?

[ "$RAN" -eq "$EXPECTED_CASES" ] || { echo "🛑 ran $RAN cases, expected $EXPECTED_CASES"; exit 1; }
[ "$FAIL" -eq 0 ] || { echo "❌ worktree-teardown fixtures: $FAIL of $RAN failed"; cat "$ROOT/list.err"; exit 1; }
echo "✅ worktree-teardown fixtures: $PASS/$RAN passed"
