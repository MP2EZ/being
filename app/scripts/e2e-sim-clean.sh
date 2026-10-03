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
#
# INFRA-691 — the CocoaPods cache leaks the same way, ~825 MB per worktree. RN 0.85 and
# Expo's prebuilt xcframeworks embed the ABSOLUTE worktree path in their podspecs, and the
# cache key is a hash of the spec, so no two worktrees ever share an entry and nothing ever
# prunes one. Same rule: an entry is an orphan when every root its spec records is gone.
# A worktree reuses its own entry on rebuild, so reaping on build would only force a
# re-extract — except under `eas build --local`, whose working dir is new every run; the EAS
# fallback reaps its own entries with `--pods-under` (see e2e-sim-build-eas.sh).
set -euo pipefail

SELF_APP="$(cd "$(dirname "$0")/.." && pwd)" # -> app/
DD_ROOT="$HOME/Library/Developer/Xcode/DerivedData"
WORKSPACE_SUFFIX="/app/ios/Being.xcworkspace"
THIS_WORKSPACE="$SELF_APP/ios/Being.xcworkspace"
# CP_CACHE_DIR is CocoaPods' own override of its cache root.
POD_ROOT="${CP_CACHE_DIR:-$HOME/Library/Caches/CocoaPods}/Pods"

MODE="report" # report | orphans | pods-under
CONFIRM=0
PODS_SCOPE=""

usage() {
  cat <<'EOF'
Usage: e2e-sim-clean.sh [--orphans | --pods-under DIR] [--yes]

  (no flags)         Report every Being-* DerivedData cache. Deletes nothing.
  --yes              Delete THIS worktree's cache.
  --orphans          List DerivedData caches and CocoaPods cache entries whose worktree no
                     longer exists, and the reclaimable totals.
  --orphans --yes    Reap those orphans.
  --pods-under DIR   CocoaPods cache entries keyed under DIR only, live or not (the EAS
                     fallback's own working dir). Reaped with --yes. DerivedData untouched.
  -h, --help         This message.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --orphans) MODE="orphans" ;;
    --yes) CONFIRM=1 ;;
    --pods-under)
      if [ $# -lt 2 ] || [ -z "$2" ]; then
        echo "--pods-under requires a directory." >&2
        echo "" >&2
        usage >&2
        exit 2
      fi
      MODE="pods-under"
      PODS_SCOPE="$2"
      shift
      ;;
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

# ---------------------------------------------------------------------------------------
# INFRA-691 — CocoaPods cache entries: External/<pod>/<key>/ + Specs/External/<pod>/<key>.podspec.json
# ---------------------------------------------------------------------------------------
POD_ORPHANS=0
POD_ORPHAN_KB=0
POD_REAPED=0
POD_REAPED_KB=0

# One `state<TAB>pod<TAB>key<TAB>roots` line per entry:
#   unknown       spec missing or unparseable                 never reaped, reported
#   shared        no worktree-shaped path anywhere in the spec  never reaped (git/maven pods)
#   live          any recorded root still exists              never reaped
#   orphan        every recorded root is gone (--pods-under: every root is under DIR)
#   out-of-scope  --pods-under only: some root lies outside DIR
# A root is the prefix before the first /app/ios/ or /app/node_modules/ in ANY string in the
# spec, not just `source`: hermes-engine's source is a maven URL, and the worktree path that
# keys it rides in HERMES_CLI_PATH. For an EAS build the root is `<workingdir>/build`.
pod_classify() {
  node - "$POD_ROOT" "$PODS_SCOPE" <<'NODE'
const fs = require('fs');
const path = require('path');
const [podRoot, scope] = process.argv.slice(2);
const ext = path.join(podRoot, 'External');
const specs = path.join(podRoot, 'Specs', 'External');
const ROOT_RE = /(?:^|[\s"'=(])(?:file:\/\/)?(\/[^\s"'$;:()]*?)\/app\/(?:ios|node_modules)\//g;
// macOS: /var and /tmp are symlinks into /private, and CocoaPods may record either spelling.
const norm = (p) => p.replace(/^\/private(?=\/(?:var|tmp)\/)/, '').replace(/\/+$/, '');
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const ls = (d) => { try { return fs.readdirSync(d).filter((n) => !n.startsWith('.')); } catch { return []; } };
const roots = (spec) => {
  const found = new Set();
  const walk = (v) => {
    if (typeof v === 'string') {
      for (const m of v.matchAll(ROOT_RE)) if (!/(^|\/)\.\.?(\/|$)/.test(m[1])) found.add(m[1]);
    } else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(spec);
  return [...found];
};
const within = (r) => { const n = norm(r), s = norm(scope); return n === s || n.startsWith(`${s}/`); };
for (const pod of ls(ext).filter((p) => isDir(path.join(ext, p)))) {
  for (const key of ls(path.join(ext, pod)).filter((k) => isDir(path.join(ext, pod, k)))) {
    let state;
    let rs = [];
    try {
      rs = roots(JSON.parse(fs.readFileSync(path.join(specs, pod, `${key}.podspec.json`), 'utf8')));
      if (rs.length === 0) state = 'shared';
      else if (scope) state = rs.every(within) ? 'orphan' : 'out-of-scope';
      else state = rs.some(isDir) ? 'live' : 'orphan';
    } catch {
      state = 'unknown';
    }
    console.log([state, pod, key, rs.join(' ')].join('\t'));
  }
}
NODE
}

pod_sweep() {
  local listing state pod key roots entry spec size kb
  if [ ! -d "$POD_ROOT/External" ]; then
    echo "CocoaPods cache: no CocoaPods cache at $POD_ROOT — nothing to reap."
    return 0
  fi
  # Fails safe: a classifier that cannot run classifies nothing, so nothing is reaped.
  if ! listing="$(pod_classify)"; then
    echo "CocoaPods cache: could not classify entries under $POD_ROOT — nothing reaped." >&2
    return 0
  fi
  local tag="[ORPHAN]"
  case "$MODE" in
    orphans) echo "Scanning $POD_ROOT for entries whose worktree no longer exists." ;;
    pods-under)
      tag="[under scope]"
      echo "Scanning $POD_ROOT for entries keyed under $PODS_SCOPE."
      ;;
  esac

  while IFS=$'\t' read -r state pod key roots; do
    [ -n "$pod" ] && [ -n "$key" ] || continue
    entry="$POD_ROOT/External/$pod/$key"
    spec="$POD_ROOT/Specs/External/$pod/$key.podspec.json"
    size="$(du -sh "$entry" 2>/dev/null | cut -f1 || true)"
    if [ "$state" = "unknown" ]; then
      [ "$MODE" != "orphans" ] || echo "    $size  $pod/$key   [unknown spec — never reaped]"
      continue
    fi
    [ "$state" = "orphan" ] || continue

    kb="$(du -sk "$entry" 2>/dev/null | cut -f1 || true)"
    case "$kb" in
      '' | *[!0-9]*) kb=0 ;;
    esac
    POD_ORPHANS=$((POD_ORPHANS + 1))
    POD_ORPHAN_KB=$((POD_ORPHAN_KB + kb))
    [ "$MODE" = "report" ] && continue
    echo "  ► $size  $pod/$key   $tag $roots"
    [ "$CONFIRM" = "1" ] || continue
    # Re-assert the shape immediately before the only destructive calls: each name is one
    # plain path segment under this cache, never a traversal.
    case "$pod/$key" in
      */*/* | .* | */.*) continue ;;
    esac
    rm -rf "${entry:?}"
    rm -f "${spec:?}"
    POD_REAPED=$((POD_REAPED + 1))
    POD_REAPED_KB=$((POD_REAPED_KB + kb))
    echo "    deleted"
  done <<EOF
$listing
EOF

  [ "$MODE" = "report" ] || echo ""
  case "$MODE" in
    report)
      if [ "$POD_ORPHANS" -gt 0 ]; then
        echo "$POD_ORPHANS orphaned CocoaPods cache entr(ies), ~$(human_gb "$POD_ORPHAN_KB") reclaimable:"
        echo "  npm run e2e:safety:clean:orphans -- --yes"
      fi
      ;;
    pods-under)
      if [ "$CONFIRM" = "1" ]; then
        echo "CocoaPods cache: Reaped $POD_REAPED entr(ies) keyed under $PODS_SCOPE, ~$(human_gb "$POD_REAPED_KB") reclaimed."
      else
        echo "CocoaPods cache: Found $POD_ORPHANS entr(ies) keyed under $PODS_SCOPE, ~$(human_gb "$POD_ORPHAN_KB") reclaimable."
      fi
      ;;
    *)
      if [ "$CONFIRM" = "1" ]; then
        echo "CocoaPods cache: Reaped $POD_REAPED orphaned entr(ies), ~$(human_gb "$POD_REAPED_KB") reclaimed."
      else
        echo "CocoaPods cache: Found $POD_ORPHANS orphaned entr(ies), ~$(human_gb "$POD_ORPHAN_KB") reclaimable."
      fi
      ;;
  esac
}

if [ "$MODE" = "pods-under" ]; then
  pod_sweep
  exit 0
fi

[ -d "$DD_ROOT" ] || echo "No DerivedData directory at $DD_ROOT — nothing to clean there."

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
    echo "DerivedData: Reaped $REAPED_COUNT orphaned cache(s), ~$(human_gb "$REAPED_KB") reclaimed."
  else
    echo "DerivedData: Found $ORPHAN_COUNT orphaned cache(s), ~$(human_gb "$ORPHAN_KB") reclaimable."
  fi
  echo ""
  pod_sweep
  if [ "$CONFIRM" != "1" ] && [ $((ORPHAN_COUNT + POD_ORPHANS)) -gt 0 ]; then
    echo "Nothing deleted. Re-run to reclaim:"
    echo "  npm run e2e:safety:clean:orphans -- --yes"
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
pod_sweep
if [ "$CONFIRM" != "1" ]; then
  echo ""
  echo "Nothing deleted. Re-run with --yes to reclaim THIS worktree's cache:"
  echo "  npm run e2e:safety:clean -- --yes"
fi
