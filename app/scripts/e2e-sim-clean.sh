#!/usr/bin/env bash
#
# INFRA-383 — report and optionally reclaim this worktree's Xcode DerivedData.
#
# Why this exists: the incremental gate build trades disk for time. DerivedData is ~7.5 GB
# and is keyed by PROJECT PATH, so every worktree accumulates its own copy — with 8
# worktrees that is ~60 GB. Documentation is not a control for something that fills a
# laptop disk mid-tranche, so this makes the cost visible and reclaimable.
#
# It resolves the right directory by reading each DerivedData `info.plist`'s WorkspacePath
# rather than guessing at Xcode's path hash, so it can never delete a sibling worktree's
# cache. Deleting only costs you one cold build (~11 min) in this worktree.
#
#   npm run e2e:safety:clean          # report sizes only
#   npm run e2e:safety:clean -- --yes # actually delete this worktree's cache
set -euo pipefail

cd "$(dirname "$0")/.." || exit 1 # -> app/

DD_ROOT="$HOME/Library/Developer/Xcode/DerivedData"
WORKSPACE="$(pwd)/ios/Being.xcworkspace"
CONFIRM="${1:-}"

[ -d "$DD_ROOT" ] || { echo "No DerivedData directory at $DD_ROOT — nothing to clean."; exit 0; }

echo "Worktree workspace: $WORKSPACE"
echo ""

FOUND=0
for d in "$DD_ROOT"/Being-*; do
  [ -d "$d" ] || continue
  PLIST="$d/info.plist"
  [ -f "$PLIST" ] || continue
  WS="$(plutil -extract WorkspacePath raw -o - "$PLIST" 2>/dev/null || true)"
  SIZE="$(du -sh "$d" 2>/dev/null | cut -f1)"
  if [ "$WS" = "$WORKSPACE" ]; then
    FOUND=1
    echo "  ► $SIZE  $(basename "$d")   [THIS worktree]"
    if [ "$CONFIRM" = "--yes" ]; then
      rm -rf "$d"
      echo "    deleted — the next build in this worktree will be cold (~11 min)"
    fi
  else
    echo "    $SIZE  $(basename "$d")   ${WS:-<unknown workspace>}"
  fi
done

if [ "$FOUND" = "0" ]; then
  echo "  (no DerivedData for this worktree yet — the next build will be cold)"
fi

if [ "$CONFIRM" != "--yes" ]; then
  echo ""
  echo "Nothing deleted. Re-run with --yes to reclaim THIS worktree's cache:"
  echo "  npm run e2e:safety:clean -- --yes"
fi
