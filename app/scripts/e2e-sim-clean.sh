#!/usr/bin/env bash
#
# INFRA-383 — report and optionally reclaim this worktree's Xcode DerivedData.
# INFRA-435 — also reclaim ORPHANED caches whose worktree no longer exists.
#
# Why this exists: the incremental gate build trades disk for time. DerivedData is ~5-7 GB
# and is keyed by PROJECT PATH, so every worktree accumulates its own copy. Documentation is
# not a control for something that fills a laptop disk mid-tranche, so this makes the cost
# visible and reclaimable.
#
# The leak INFRA-435 closes: nothing reaped a cache when its worktree was removed. Once the
# worktree is gone the pre-INFRA-435 script could not reach that cache even in principle —
# its only delete branch was keyed to the workspace path of the worktree it was running in,
# which for a removed worktree is uncomputable. Caches therefore accumulated permanently, at
# roughly one per closed work item, until a build died with `lipo: No space left on device`.
#
#   npm run e2e:safety:clean                      # report every Being-* cache, delete nothing
#   npm run e2e:safety:clean -- --yes             # delete THIS worktree's cache
#   npm run e2e:safety:clean:orphans              # list orphans + reclaimable total
#   npm run e2e:safety:clean:orphans -- --yes     # reap the orphans
#
# ORPHANHOOD IS KEYED ON THE WORKTREE ROOT, NEVER THE .xcworkspace LEAF.
# This is the whole correctness argument, and the obvious predicate is the wrong one.
# `app/ios/` is generated (CNG, INFRA-280) and is legitimately absent from live worktrees:
#   * `e2e-sim-build.sh` runs `expo prebuild --platform ios --clean` INSIDE the shared gate
#     worktree, deleting `app/ios/` for the ~7 minutes of a post-regen build. A leaf-keyed
#     sweep run in that window deletes the gate's own multi-GB cache mid-build.
#   * A worktree between `prebuild` and `pod install` has `app/ios/` but no `.xcworkspace`.
# The worktree ROOT is what `git worktree remove` deletes, so its absence is the only signal
# that means "nobody can be building here."
#
# `info.plist` is the only sound source for the mapping: Xcode's `Being-<hash>` suffix is a
# hash of the project path and is not reversible.
set -euo pipefail

SELF_APP="$(cd "$(dirname "$0")/.." && pwd)" # -> app/
DD_ROOT="$HOME/Library/Developer/Xcode/DerivedData"
WORKSPACE_SUFFIX="/app/ios/Being.xcworkspace"
THIS_WORKSPACE="$SELF_APP/ios/Being.xcworkspace"

MODE="report" # report | orphans
CONFIRM=0

usage() {
  cat <<'EOF'
Usage: e2e-sim-clean.sh [--orphans] [--yes]

  (no flags)         Report every Being-* DerivedData cache. Deletes nothing.
  --yes              Delete THIS worktree's cache.
  --orphans          List caches whose worktree no longer exists, and the reclaimable total.
  --orphans --yes    Reap those orphans.
  -h, --help         This message.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --orphans) MODE="orphans" ;;
    --yes) CONFIRM=1 ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unrecognised flag: $1" >&2
      echo "" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

[ -d "$DD_ROOT" ] || {
  echo "No DerivedData directory at $DD_ROOT — nothing to clean."
  exit 0
}

# Resolve a recorded WorkspacePath to the worktree root that owns it.
# Echoes nothing when the path does not have the expected shape — an unrecognised layout is
# classified UNKNOWN and never deleted, rather than guessed at.
worktree_root_of() {
  case "$1" in
    *"$WORKSPACE_SUFFIX") printf '%s' "${1%"$WORKSPACE_SUFFIX"}" ;;
    *) printf '' ;;
  esac
}

# du -sh for the human-readable column, du -sk for arithmetic. bash 3.2 has no floats, so
# totals accumulate as integer KB and are formatted once at print time.
human_gb() {
  awk -v kb="$1" 'BEGIN {
    if (kb >= 1048576) printf "%.1f GB", kb / 1048576;
    else printf "%.0f MB", kb / 1024;
  }'
}

if [ "$MODE" = "orphans" ]; then
  echo "Scanning $DD_ROOT for caches whose worktree no longer exists."
  echo ""
else
  echo "Worktree workspace: $THIS_WORKSPACE"
  echo ""
fi

FOUND_SELF=0
ORPHAN_COUNT=0
ORPHAN_KB=0
REAPED_COUNT=0
REAPED_KB=0

for d in "$DD_ROOT"/Being-*; do
  [ -d "$d" ] || continue
  PLIST="$d/info.plist"
  [ -f "$PLIST" ] || continue

  # A missing or unreadable key yields the empty string. That is NOT an orphan: `[ ! -d "" ]`
  # is true, so treating empty as "worktree gone" would reap every cache whose plist cannot
  # be parsed — exactly the ones whose contents cannot be reasoned about.
  WS="$(plutil -extract WorkspacePath raw -o - "$PLIST" 2>/dev/null || true)"
  SIZE="$(du -sh "$d" 2>/dev/null | cut -f1 || true)"
  KB="$(du -sk "$d" 2>/dev/null | cut -f1 || true)"
  case "$KB" in
    '' | *[!0-9]*) KB=0 ;;
  esac

  WT_ROOT=""
  [ -n "$WS" ] && WT_ROOT="$(worktree_root_of "$WS")"

  if [ -z "$WS" ] || [ -z "$WT_ROOT" ]; then
    STATE="unknown"
  elif [ -d "$WT_ROOT" ]; then
    STATE="live"
  else
    STATE="orphan"
  fi

  if [ "$MODE" = "orphans" ]; then
    [ "$STATE" = "orphan" ] || {
      if [ "$STATE" = "unknown" ]; then
        echo "    $SIZE  $(basename "$d")   [unknown workspace — never reaped]"
      fi
      continue
    }
    ORPHAN_COUNT=$((ORPHAN_COUNT + 1))
    ORPHAN_KB=$((ORPHAN_KB + KB))
    echo "  ► $SIZE  $(basename "$d")   [ORPHAN] $WT_ROOT"
    if [ "$CONFIRM" = "1" ]; then
      # Re-assert the prefix immediately before the only destructive call in this file.
      case "$d" in
        "$DD_ROOT"/Being-*) ;;
        *) continue ;;
      esac
      rm -rf "${d:?}"
      REAPED_COUNT=$((REAPED_COUNT + 1))
      REAPED_KB=$((REAPED_KB + KB))
      echo "    deleted"
    fi
    continue
  fi

  # report mode
  if [ "$WS" = "$THIS_WORKSPACE" ]; then
    FOUND_SELF=1
    echo "  ► $SIZE  $(basename "$d")   [THIS worktree]"
    if [ "$CONFIRM" = "1" ]; then
      case "$d" in
        "$DD_ROOT"/Being-*) ;;
        *) continue ;;
      esac
      rm -rf "${d:?}"
      REAPED_KB=$((REAPED_KB + KB))
      echo "    deleted — the next build in this worktree will be cold (~21 min)"
    fi
  elif [ "$STATE" = "orphan" ]; then
    ORPHAN_COUNT=$((ORPHAN_COUNT + 1))
    ORPHAN_KB=$((ORPHAN_KB + KB))
    echo "    $SIZE  $(basename "$d")   [ORPHAN] $WT_ROOT"
  elif [ "$STATE" = "unknown" ]; then
    echo "    $SIZE  $(basename "$d")   [unknown workspace — never reaped]"
  else
    echo "    $SIZE  $(basename "$d")   $WS"
  fi
done

echo ""

# Report the total on EVERY path, including zero. A sweep that has silently stopped matching
# looks exactly like a clean machine, so the empty case has to say so out loud (INFRA-423).
if [ "$MODE" = "orphans" ]; then
  if [ "$CONFIRM" = "1" ]; then
    echo "Reaped $REAPED_COUNT orphaned cache(s), ~$(human_gb "$REAPED_KB") reclaimed."
  else
    echo "Found $ORPHAN_COUNT orphaned cache(s), ~$(human_gb "$ORPHAN_KB") reclaimable."
    if [ "$ORPHAN_COUNT" -gt 0 ]; then
      echo "Nothing deleted. Re-run to reclaim:"
      echo "  npm run e2e:safety:clean:orphans -- --yes"
    fi
  fi
  # `du` reports allocated blocks and APFS clones share them, so the freed-space delta can
  # be smaller than this figure. Hence "~".
  exit 0
fi

if [ "$FOUND_SELF" = "0" ]; then
  echo "  (no DerivedData for this worktree yet — the next build will be cold)"
fi
if [ "$ORPHAN_COUNT" -gt 0 ]; then
  echo "$ORPHAN_COUNT orphaned cache(s) from removed worktrees, ~$(human_gb "$ORPHAN_KB") reclaimable:"
  echo "  npm run e2e:safety:clean:orphans -- --yes"
fi
if [ "$CONFIRM" != "1" ]; then
  echo ""
  echo "Nothing deleted. Re-run with --yes to reclaim THIS worktree's cache:"
  echo "  npm run e2e:safety:clean -- --yes"
fi
