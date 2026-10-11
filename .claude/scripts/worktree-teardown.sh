#!/usr/bin/env bash
#
# worktree-teardown.sh — INFRA-693
#
# The one copy of worktree teardown, shared by /b-close Step 5.1 and /b-work Step 0.4.
#
#   list   [--repo DIR] [--exclude DIR]...
#          Worktrees safe to OFFER for removal, one per line: dir<TAB>branch<TAB>size<TAB>age.
#          Offered only when every guard holds: on a branch (not detached), not locked, not the
#          main/bare entry, not `development`, `e2e-gate`, an app-made `.claude/worktrees/`
#          session checkout or an --exclude; a merged PR into development exists for the
#          branch; its tip is an ancestor of origin/development; and `git status --porcelain`
#          is empty (untracked files count, gitignored ones such as node_modules do not).
#          The PR check is load-bearing: a fresh branch with no commits of its own is
#          trivially an ancestor of origin/development, so ancestry alone reads it as merged.
#   remove [--repo DIR] [--require-clean] [--no-sweep] DIR...
#          Step 5.1's sequence: `git worktree remove --force` per dir, then `sweep`. It never runs
#          rm -rf — the harness refuses it on a worktree dir and it needs a human's approval —
#          so a dir that survives is reported with the command to run.
#   sweep  [--repo DIR]
#          One `git worktree prune`, then one orphan sweep (e2e-sim-clean.sh --orphans --yes
#          from the development worktree, capability-gated like b-work Step 0.3), reported in
#          one line. Machine-wide: it reaps every orphan, not just this removal's.
#
# Exit: 0 ok · 1 a remove was refused or left a dir behind · 2 tooling error
#
# WT_TEARDOWN_MERGED_FILE (tests only): branch names with a merged PR, one per line, read
# instead of asking gh.

if [ -z "${BASH_VERSION:-}" ]; then echo "run with bash" >&2; exit 2; fi

REPO=/Users/max/dev/being
MODE="${1:-}"; shift || true
EXCLUDES=(); DIRS=(); REQUIRE_CLEAN=""; NO_SWEEP=""
while [ $# -gt 0 ]; do
  case "$1" in
    --repo) REPO="$2"; shift 2 ;;
    --exclude) EXCLUDES+=("$(cd "$2" 2>/dev/null && pwd -P || echo "$2")"); shift 2 ;;
    --require-clean) REQUIRE_CLEAN=1; shift ;;
    --no-sweep) NO_SWEEP=1; shift ;;
    -*) echo "🛑 unknown argument $1" >&2; exit 2 ;;
    *) DIRS+=("$(cd "$1" 2>/dev/null && pwd -P || echo "$1")"); shift ;;
  esac
done
git -C "$REPO" rev-parse --git-dir >/dev/null 2>&1 || { echo "🛑 $REPO is not a git repo" >&2; exit 2; }

# Emits one line per worktree: dir<TAB>branch-or-empty<TAB>flags. Flags: main, locked.
worktrees() {
  local first=1 path="" branch="" flags=""
  while IFS= read -r line; do
    case "$line" in
      "worktree "*) path="${line#worktree }"; branch=""; flags="" ;;
      "branch refs/heads/"*) branch="${line#branch refs/heads/}" ;;
      bare) flags="$flags main" ;;
      locked*) flags="$flags locked" ;;
      "")
        [ -n "$path" ] || continue
        [ -n "$first" ] && flags="$flags main"; first=""
        printf '%s\t%s\t%s\n' "$path" "$branch" "$flags"; path="" ;;
    esac
  done < <(git -C "$REPO" worktree list --porcelain; echo)
}

# Names that are never teardown targets, whatever their state.
protected() { # protected <dir> <branch> <flags>
  case " $3 " in *" main "*|*" locked "*) return 0 ;; esac
  case "$1" in */.claude/worktrees/*) return 0 ;; esac
  [ "$(basename "$1")" = development ] || [ "$2" = development ] || [ "$(basename "$1")" = e2e-gate ]
}

has_merged_pr() { # 0 yes · 1 no · 2 lookup failed
  if [ -n "${WT_TEARDOWN_MERGED_FILE:-}" ]; then
    [ -r "$WT_TEARDOWN_MERGED_FILE" ] || return 2
    grep -qxF "$1" "$WT_TEARDOWN_MERGED_FILE"; return $?
  fi
  local n
  n="$(cd "$REPO" && gh pr list --head "$1" --base development --state merged --json number -q 'length' 2>/dev/null)" || return 2
  [ "${n:-0}" -gt 0 ]
}

do_list() {
  git -C "$REPO" fetch -q origin development 2>/dev/null
  git -C "$REPO" rev-parse --verify -q origin/development >/dev/null || { echo "🛑 no origin/development in $REPO" >&2; exit 2; }
  local dir branch flags ex rc
  while IFS=$'\t' read -r dir branch flags; do
    [ -n "$branch" ] || continue
    protected "$dir" "$branch" "$flags" && continue
    for ex in "${EXCLUDES[@]+"${EXCLUDES[@]}"}"; do [ "$dir" = "$ex" ] && continue 2; done
    [ -d "$dir" ] || continue
    git -C "$REPO" merge-base --is-ancestor "refs/heads/$branch" origin/development 2>/dev/null || continue
    [ -z "$(git -C "$dir" status --porcelain 2>/dev/null)" ] || continue
    has_merged_pr "$branch"; rc=$?
    [ $rc -eq 2 ] && { echo "🛑 merged-PR lookup failed for $branch" >&2; exit 2; }
    [ $rc -eq 0 ] || continue
    printf '%s\t%s\t%s\t%s\n' "$dir" "$branch" "$(du -sh "$dir" 2>/dev/null | cut -f1 | tr -d ' ')" \
      "$(git -C "$dir" log -1 --format=%cr)"
  done < <(worktrees)
}

do_remove() {
  [ ${#DIRS[@]} -gt 0 ] || { echo "🛑 remove needs at least one worktree dir" >&2; exit 2; }
  local rc=0 target dir branch flags found
  for target in "${DIRS[@]}"; do
    found=""
    while IFS=$'\t' read -r dir branch flags; do
      [ "$dir" = "$target" ] && { found=1; break; }
    done < <(worktrees)
    if [ -z "$found" ]; then
      # gh pr merge can remove the worktree itself (b-close Step 3.5): gone is done, not a failure.
      if [ -e "$target" ]; then echo "⛔ $target is not a registered worktree — skipped"; rc=1
      else echo "ℹ️  $target is already gone"; fi
      continue
    fi
    if protected "$dir" "$branch" "$flags"; then echo "⛔ $target is protected — skipped"; rc=1; continue; fi
    if [ -n "$REQUIRE_CLEAN" ] && [ -n "$(git -C "$dir" status --porcelain 2>/dev/null)" ]; then
      echo "⛔ $target has uncommitted changes — skipped"; rc=1; continue
    fi
    git -C "$REPO" worktree remove --force "$dir" 2>&1
    if [ -e "$dir" ]; then
      echo "⚠️  $dir survived the remove. To finish, with your approval:"
      echo "    rm -rf \"$dir\" && git -C \"$REPO\" worktree prune"
      rc=1
    else
      echo "🗑️  Worktree removed: $dir"
    fi
  done
  if [ -n "$NO_SWEEP" ]; then git -C "$REPO" worktree prune; return $rc; fi
  do_sweep || rc=1
  return $rc
}

do_sweep() {
  git -C "$REPO" worktree prune
  # Run from the development worktree, never one being removed: the script goes with it.
  local dev_app="$REPO/development/app" out
  if ! node -e "process.exit(require('$dev_app/package.json').scripts['e2e:safety:clean:orphans']?0:1)" 2>/dev/null; then
    echo "ℹ️  development predates the orphan sweep — DerivedData/CocoaPods left as is."; return 0
  fi
  out="$(bash "$dev_app/scripts/e2e-sim-clean.sh" --orphans --yes 2>&1)" \
    || { echo "⚠️  orphan sweep failed:"; echo "$out" | tail -5; return 1; }
  echo "♻️  $(echo "$out" | grep -E '^(DerivedData|CocoaPods cache): ' | paste -sd'|' - | sed 's/|/ · /g') (machine-wide)"
}

case "$MODE" in
  list) do_list ;;
  remove) do_remove; exit $? ;;
  sweep) do_sweep; exit $? ;;
  *) echo "usage: worktree-teardown.sh list|remove|sweep [options] (see header)" >&2; exit 2 ;;
esac
