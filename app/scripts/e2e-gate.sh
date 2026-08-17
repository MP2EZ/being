#!/usr/bin/env bash
#
# INFRA-436 — build the safety gate's artifact in ONE long-lived worktree, so a queue of
# attended closes pays one cold build instead of N.
#
# WHY THIS SAVES ANYTHING. Measured on-machine 2026-08-14:
#
#   cold build, fresh worktree ............ 1291 s  (21m31s)
#   warm rebuild, 37-file branch switch ...   93 s
#   warm rebuild, 112-file branch switch ..   87 s
#   no-op rebuild, same commit ............   31 s
#
# Xcode keys DerivedData by WORKSPACE PATH (`~/Library/Developer/Xcode/DerivedData/
# Being-<hash>`, ~5-7 GB apiece, 27 GB across 5 worktrees when this was written), so the
# warm cache belongs to a PATH, not to a branch. `/b-work` creates a fresh worktree per
# item, which is why 7 of 9 live worktrees had no cache at all and every first gate build
# in them cost the full 21 minutes. Reusing one path is the entire trick. Note the warm
# figure does NOT scale with diff size — the RN bundling phase re-runs wholesale either
# way — so treat any switch as a flat ~90 s.
#
# WHY THIS IS SOUND, not a shortcut. `e2e-provenance.js verify` compares treeHash and
# bundleId only; `repoRoot` and `branch` are recorded but never read. The fingerprint is
# content-addressed, so a binary built at commit X in worktree A is the same binary as one
# built at commit X in worktree B — and the marker proves it. Verified end to end: built in
# e2e-gate, verified from infra-395, MATCH_CLEAN, and crisis-button-reachability passed.
#
# WHAT THIS DOES NOT CHANGE. The gate's evidence semantics are identical: each item is
# still gated on its own tree, at its own commit. This removes redundant compilation, not a
# check. In particular it is NOT batching — it does not gate several items against one
# merged tree, which would be a different and weaker claim.
#
# ORDERING THAT MATTERS. `/b-close` Step 2.5.4 requires the gated tree to contain
# `origin/development`, so the back-merge happens in the ITEM's worktree FIRST; only then
# is the gate pointed at the resulting commit. Pointing the gate at a bare branch tip gates
# a tree that will never merge.

# OWNERSHIP (INFRA-463). The worktree above is shared mutable state and, as first shipped,
# had no owner: any session could re-point it at any moment, including between another
# session's checkout and that session's build. Observed 2026-08-16 with ten worktrees live —
# a gate build compiled a peer's in-progress tree and died on an import that existed on no
# branch of the caller. It failed loudly only because that tree happened not to compile; had
# it compiled, the gate would have produced a confident verdict about the wrong binary, with
# no trace. Two controls are added below, and they cover different things:
#
#   - A LOCK over checkout -> build, so tool-driven runs cannot interleave.
#   - RE-READING the gate worktree's HEAD after the checkout, before the build and after it,
#     because `git -C e2e-gate checkout` by hand takes no lock at all.
#
# The lock spans the build only. `e2e-safety.sh` re-reads the provenance marker inside the
# INSTALLED CONTAINER and never consults this worktree, so nothing after the build depends on
# it; that window is INFRA-434's (marker re-check, exit 3). Keeping the span inside one live
# process is what lets the lock be anchored to a pid instead of a TTL.
#
# THE TRADE. Sharing is kept, so two concurrent closes now serialise their BUILDS — about
# 90 s of waiting — instead of silently compiling each other's trees. Flow runs are not
# serialised. A session unwilling to wait is told to build in its own worktree, which is
# correct and merely cold.

set -uo pipefail

BUNDLE_ID="fyi.being.app"

die() { echo "❌ e2e-gate: $*" >&2; exit 1; }

# shellcheck source=scripts/e2e-sim-lock.sh
. "$(dirname "$0")/e2e-sim-lock.sh"

# --- Where are we, and what are we gating? ---------------------------------------------
CALLER_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" \
  || die "not inside a git work tree — run this from the item's worktree."

REF="${1:-HEAD}"
SHA="$(git -C "$CALLER_ROOT" rev-parse --verify "${REF}^{commit}" 2>/dev/null)" \
  || die "could not resolve '$REF' to a commit in $CALLER_ROOT"

# --- Refuse a dirty caller EARLY, naming the files -------------------------------------
# The gate worktree checks out a COMMIT, so its tree is clean by construction. If the
# caller's tree is not byte-identical to that commit, the provenance verify at the end will
# refuse — after a build. Catching it here turns a ~90 s round trip plus a cryptic MISMATCH
# into an immediate, actionable list. This is the `feat-417` shape: three untracked files
# under app/src were enough to change its fingerprint.
DIRTY="$(git -C "$CALLER_ROOT" status --porcelain 2>/dev/null)"
if [ -n "$DIRTY" ]; then
  echo "❌ e2e-gate: the calling worktree is not clean, so the gate build could not" >&2
  echo "   correspond to it. What merges is the commit; these files are not in it:" >&2
  git -C "$CALLER_ROOT" status --short >&2
  echo "" >&2
  echo "   Commit, stash, or remove them, then re-run." >&2
  exit 1
fi

if [ "$(git -C "$CALLER_ROOT" rev-parse HEAD)" != "$SHA" ]; then
  echo "ℹ️  Gating $REF ($(echo "$SHA" | cut -c1-8)), which is not this worktree's HEAD." >&2
  echo "   The provenance check at the end compares against THIS tree, so it will refuse" >&2
  echo "   unless you meant to move here first." >&2
fi

# --- Resolve the gate worktree ----------------------------------------------------------
# Default sits beside the other worktrees at the bare-repo root. `git rev-parse
# --git-common-dir` resolves to the shared .git across every worktree, so its parent is the
# bare root regardless of which worktree we were invoked from.
COMMON_DIR="$(git -C "$CALLER_ROOT" rev-parse --git-common-dir 2>/dev/null)"
case "$COMMON_DIR" in
  /*) ;;
  *) COMMON_DIR="$CALLER_ROOT/$COMMON_DIR" ;;
esac
BARE_ROOT="$(cd "$(dirname "$COMMON_DIR")" && pwd)"
GATE="${E2E_GATE_WORKTREE:-$BARE_ROOT/e2e-gate}"

# --- Take ownership of the gate worktree BEFORE touching it -----------------------------
# The key is the gate PATH, sanitised into one path segment — readable in diagnostics, and
# per-path so a caller pointed elsewhere via E2E_GATE_WORKTREE contends only with its own.
GATE_KEY="$(printf '%s' "$GATE" | tr -c 'A-Za-z0-9._-' '_')"

if ! e2e_lock_acquire "$GATE_KEY" \
     "${E2E_GATE_LOCK_TIMEOUT:-${E2E_LOCK_TIMEOUT:-1800}}" \
     "gate build $(echo "$SHA" | cut -c1-8)" gatetree; then
  echo "" >&2
  echo "❌ e2e-gate: another session owns the shared gate worktree at" >&2
  echo "   $GATE" >&2
  echo "" >&2
  echo "   Waiting is usually right — a gate build is ~90 s warm. If you would rather not:" >&2
  echo "     cd $CALLER_ROOT/app && npm run e2e:safety:build" >&2
  echo "   builds in your own worktree instead. That is correct and gates the same tree;" >&2
  echo "   it is only cold (~21 min the first time in a fresh worktree)." >&2
  exit 1
fi
trap 'e2e_lock_release "$GATE_KEY" gatetree' EXIT INT TERM

# Which worktree currently sits at a given commit — best effort, so a refusal can name the
# peer rather than leaving the operator to find them.
gate_blame() {
  git -C "$BARE_ROOT" worktree list --porcelain 2>/dev/null \
    | awk -v s="$1" -v g="$GATE" '
        /^worktree /{ w=substr($0,10) }
        /^HEAD /    { if ($2==s && w!=g) print "   also at this commit: " w }
      ' | head -3
}

# Re-read the gate worktree's HEAD. The lock stops lock-respecting sessions; this catches
# everything else, and it is what turns a post-build provenance MISMATCH — whose message
# points at rebuilding — into a diagnosis naming the actual cause.
assert_gate_at() {
  local phase="$1" now
  now="$(git -C "$GATE" rev-parse HEAD 2>/dev/null)"
  [ "$now" = "$SHA" ] && return 0

  echo "" >&2
  echo "❌ e2e-gate: the gate worktree is not at the commit this run asked for ($phase)." >&2
  echo "   asked for:  $(echo "$SHA" | cut -c1-8)  ($REF, from $CALLER_ROOT)" >&2
  if [ -n "$now" ]; then
    echo "   gate is at: $(echo "$now" | cut -c1-8)" >&2
    gate_blame "$now" >&2
  else
    echo "   gate is at: <unreadable — the worktree may have been removed mid-run>" >&2
  fi
  echo "" >&2
  echo "   $GATE is shared by every session on this machine. Another session re-pointed it" >&2
  echo "   mid-run — a concurrent \`git -C\` checkout takes no lock. Do NOT treat this as a" >&2
  echo "   stale artifact: rebuilding on top of it would gate somebody else's tree." >&2
  echo "   Re-run once that session finishes, or build in your own worktree:" >&2
  echo "     cd $CALLER_ROOT/app && npm run e2e:safety:build" >&2
  exit 1
}

if [ ! -d "$GATE" ]; then
  echo "🌿 Creating the gate worktree at $GATE (first run — this build will be cold, ~21 min)."
  git -C "$BARE_ROOT" worktree add --detach "$GATE" "$SHA" >/dev/null \
    || die "could not create the gate worktree at $GATE"
else
  git -C "$GATE" checkout --detach "$SHA" >/dev/null 2>&1 \
    || die "could not point the gate worktree at $SHA (uncommitted changes in $GATE?)"
fi

assert_gate_at "just after checkout"

# Env symlinks. `/b-work` creates these for item worktrees; a hand-made worktree needs them
# or Metro resolves no env at all. `-e` follows the link, so a dangling one is repaired
# rather than skipped.
for f in production development; do
  if [ ! -e "$GATE/app/.env.$f" ]; then
    ln -sf "../../.config/.env.$f" "$GATE/app/.env.$f"
    [ -e "$GATE/app/.env.$f" ] \
      || die "app/.env.$f does not resolve — is ~/dev/being/.config/.env.$f present?"
  fi
done

# --- Dependencies: reinstall ONLY when the lockfile actually moved ----------------------
# `npm ci` costs ~31 s and wipes node_modules, so doing it per switch would eat a third of
# the saving. The stamp records the lockfile that produced the current node_modules.
LOCK="$GATE/app/package-lock.json"
STAMP="$GATE/app/node_modules/.e2e-gate-lock-stamp"
LOCK_HASH="$(shasum -a 256 "$LOCK" 2>/dev/null | cut -d' ' -f1)"
if [ ! -d "$GATE/app/node_modules" ] || [ "$(cat "$STAMP" 2>/dev/null)" != "$LOCK_HASH" ]; then
  echo "📦 Lockfile moved (or no node_modules) — running npm ci in the gate worktree…"
  # The app .npmrc resolves @mp2ez with ${GITHUB_TOKEN}, which SHADOWS the PAT in ~/.npmrc,
  # so a bare install 401s on @mp2ez/being-design-system in a fresh worktree.
  ( cd "$GATE/app" \
      && GITHUB_TOKEN="$(grep _authToken ~/.npmrc | head -1 | sed 's/.*_authToken=//')" npm ci ) \
    || die "npm ci failed in $GATE/app"
  printf '%s' "$LOCK_HASH" > "$STAMP"
else
  echo "✓ Dependencies match the lockfile at this commit — skipping npm ci"
fi

# --- Build ------------------------------------------------------------------------------
# Last check before the expensive part: `npm ci` above can run for ~31 s, which is a window.
assert_gate_at "before compiling"

# NEVER piped: a pipeline reports the LAST command's status, so a failed build would read
# as exit 0. The build takes the simulator lock itself (INFRA-436), so a peer's run cannot
# interleave with the uninstall/install below.
echo "🏗  Building in $GATE (warm ≈90 s, cold ≈21 min)…"
( cd "$GATE/app" && npm run e2e:safety:build ) || die "gate build failed"

# The expensive window — 90 s warm, 21 min cold. Checked BEFORE the provenance verify so a
# moved worktree is reported as what it is, rather than as a bare MISMATCH.
assert_gate_at "after the build"

# --- Prove the artifact corresponds to the CALLER's tree --------------------------------
# The whole design rests on this being checkable rather than assumed, so check it, from the
# caller's worktree, exactly as /b-close will.
SIM_UDID="${E2E_SIM_UDID:-}"
if [ -z "$SIM_UDID" ]; then
  SIM_UDID="$(xcrun simctl list devices booted -j 2>/dev/null \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);const a=[];for(const k in j.devices)for(const d of j.devices[k])a.push(d.udid);if(a.length===1)console.log(a[0]);}catch(e){}})')"
fi
[ -n "$SIM_UDID" ] || die "could not resolve a single booted simulator to verify against (set E2E_SIM_UDID)"

APP="$(xcrun simctl get_app_container "$SIM_UDID" "$BUNDLE_ID" 2>/dev/null)" \
  || die "the build reported success but no $BUNDLE_ID is installed on $SIM_UDID"

VERDICT="$(cd "$CALLER_ROOT/app" && node scripts/e2e-provenance.js verify "$APP" 2>/dev/null)"
if [ "$VERDICT" != "MATCH_CLEAN" ]; then
  echo "❌ e2e-gate: built in $GATE, but the artifact does not correspond to $CALLER_ROOT." >&2
  echo "   verdict: ${VERDICT:-<none>}" >&2
  ( cd "$CALLER_ROOT/app" && node scripts/e2e-provenance.js explain "$APP" ) >&2 || true
  exit 1
fi

echo ""
echo "✅ Gate artifact ready, and it verifies from $CALLER_ROOT."
echo "   built in:  $GATE ($(echo "$SHA" | cut -c1-8))"
echo "   verify:    MATCH_CLEAN"
echo "   Run flows: npm run e2e:safety   (or /b-close, which runs the scoped set)"
