# Promote Development → Main as a Release [META-COMMAND]

**ARGUMENTS**: `[BUMP] [--finish]`

**BUMP**: `patch` | `minor` | `major` — optional. If not provided, the skill
**interactively prompts** for it. Once you're comfortable with the flow,
pass explicitly to skip the prompt.

**--finish**: Run AFTER the release PR has been merged on GitHub. Tags
`main` with `vX.Y.Z` and pushes the tag. Also syncs the bare-repo's local
`refs/heads/main` to the merged state.

**GitHub Flow note (INFRA-145)**: This skill replaces "merge to main" as a
manual `gh pr create --base main` ceremony. Single source of release truth.

> 💡 For best flow: ensure Accept Edits mode is active (Shift+Tab to cycle).
> This skill runs many tool calls (git + gh CLI + env validation + version
> bumps across 4 files + Notion). Skipping prompts makes the flow much smoother.

---

## Usage examples

```bash
/b-release                 # Interactive: prompts for bump type
/b-release patch           # Patch bump (0.1.0 → 0.1.1) without prompt
/b-release minor           # Minor bump (0.1.0 → 0.2.0) without prompt
/b-release major           # Major bump (0.1.0 → 1.0.0) without prompt
/b-release --finish        # Post-merge: tag + push tag + sync worktrees
```

---

## Phase 1: Argument parsing

Parse `$ARGUMENTS`:
- If contains `--finish`: this is the POST-merge step. Skip to Phase 7.
- Otherwise, look for `patch` / `minor` / `major` as the first non-flag arg.
  If present: `BUMP=<arg>`. If absent: `BUMP=null` (prompt later).

---

## Phase 2: Pre-flight checks

Run ALL of these in order. Abort on any failure with the exact error shown.

### 2.1 Working directory

```bash
pwd
```

Must match `/Users/max/dev/being/development`. If not: ABORT with
"Run /b-release from the development worktree (~/dev/being/development)."

### 2.2 Branch + clean state

```bash
git branch --show-current
git status -uno --porcelain
```

- Branch must equal `development`. If not: ABORT with "switch to development branch first".
- `git status -uno --porcelain` must be empty. If not: ABORT with "uncommitted changes; commit or stash before releasing".

### 2.3 In sync with origin

```bash
git fetch origin
git log --oneline origin/development..development | head -5
git log --oneline development..origin/development | head -5
```

- If local development is ahead of origin: ABORT with "local development has unpushed commits; push first."
- If local development is behind origin: ABORT with "local development is behind origin; pull --rebase first."

### 2.4 Main not ahead of dev

```bash
git log --oneline development..origin/main | head -5
```

If origin/main has commits dev doesn't: ABORT with
"main has commits dev doesn't — a hotfix likely landed. Cherry-pick to dev first:
  git cherry-pick origin/main
Then retry /b-release."

### 2.5 Latest dev commit has passing CI

```bash
gh run list --branch development --limit 1 --json status,conclusion,headSha,workflowName
```

- Must show the most recent run's `conclusion` is `success` AND `headSha` matches `git rev-parse origin/development`.
- If `status` is `in_progress` or `queued`: ABORT with "CI still running on dev; wait for it to finish."
- If `conclusion` is `failure` or `cancelled`: ABORT with "CI failed on the latest dev commit; investigate before releasing."

### 2.6 INFRA-141 env schema parses successfully

```bash
cd /Users/max/dev/being/development/app
node -e "require('./src/core/config/env')" 2>&1
```

- Exit 0 means the Zod schema parsed successfully.
- Non-zero exit means a required env var is missing or out of range. ABORT and surface the Zod error verbatim (the schema's issue-formatter at `env.ts:284-290` already redacts values for compliance, so it's safe to display).

---

## Phase 3: Bump prompt

If `BUMP` is null (Phase 1 didn't get it from args):

Display:
```
🏷️  Release type? Choose bump:
  - patch (bug fixes; e.g., 1.0.0 → 1.0.1)
  - minor (new features, backward compatible; e.g., 1.0.0 → 1.1.0)
  - major (breaking changes; e.g., 1.0.0 → 2.0.0)

Type: ___
```

Wait for user input. Validate: must be one of `patch`/`minor`/`major`. If invalid, re-prompt.

---

## Phase 4: Read current version (FOUR sources, per INFRA-141)

Read the current version from all four sources:

```bash
# Source 1: app/package.json (npm semver)
PKG_VERSION=$(jq -r '.version' /Users/max/dev/being/development/app/package.json)

# Source 2: app/app.json (Expo manifest)
APP_VERSION=$(jq -r '.expo.version' /Users/max/dev/being/development/app/app.json)
IOS_BUILD=$(jq -r '.expo.ios.buildNumber' /Users/max/dev/being/development/app/app.json)
ANDROID_VERSION_CODE=$(jq -r '.expo.android.versionCode' /Users/max/dev/being/development/app/app.json)

# Source 3: .config/env.production
ENV_PROD_VERSION=$(grep '^EXPO_PUBLIC_APP_VERSION=' /Users/max/dev/being/.config/.env.production | cut -d'=' -f2)
ENV_PROD_BUILD=$(grep '^EXPO_PUBLIC_BUILD_NUMBER=' /Users/max/dev/being/.config/.env.production | cut -d'=' -f2)

# Source 4: .config/env.development
ENV_DEV_VERSION=$(grep '^EXPO_PUBLIC_APP_VERSION=' /Users/max/dev/being/.config/.env.development | cut -d'=' -f2)
ENV_DEV_BUILD=$(grep '^EXPO_PUBLIC_BUILD_NUMBER=' /Users/max/dev/being/.config/.env.development | cut -d'=' -f2)
```

### 4.1 Drift check

All four version strings (`PKG_VERSION`, `APP_VERSION`, `ENV_PROD_VERSION`, `ENV_DEV_VERSION`) must be identical. If any disagree:

```
❌ Version drift detected — refusing to release.

  app/package.json:                 [PKG_VERSION]
  app/app.json:                     [APP_VERSION]
  .config/env.production:           [ENV_PROD_VERSION]
  .config/env.development:          [ENV_DEV_VERSION]

This is the canary INFRA-141 was built for. Reconcile manually:
  1. Decide the correct current version
  2. Edit each file to match
  3. Commit on development with message "chore: reconcile version sources to vX.Y.Z"
  4. Re-run /b-release
```

ABORT. The user must resolve before retry.

Same drift check for build numbers (`IOS_BUILD`, `ANDROID_VERSION_CODE`, `ENV_PROD_BUILD`, `ENV_DEV_BUILD`). All four should be identical strings (note: `ANDROID_VERSION_CODE` is a JSON integer in app.json but treat as string for comparison).

### 4.2 Compare with git tag

```bash
LAST_TAG=$(git describe --tags --abbrev=0 origin/main \
             --match 'v[0-9]*.[0-9]*.[0-9]*' \
             --exclude '*-*' 2>/dev/null || echo "")
```

The filter combination matches strict-semver tags ONLY:
- `--match 'v[0-9]*.[0-9]*.[0-9]*'`: shape filter (vN.N.N)
- `--exclude '*-*'`: drops pre-release suffixes like `v1.0.0-alpha`, `v2.0.0-p0-cloud`, and non-semver like `v1.8-production-ready`

If `LAST_TAG` is non-empty:
- Strip the leading `v`: `TAG_VERSION=${LAST_TAG#v}`.
- If `TAG_VERSION` ≠ `PKG_VERSION`: ABORT with
  ```
  ❌ Version disagreement between git tag and version files.

    Latest semver tag on origin/main: [LAST_TAG] (= [TAG_VERSION])
    Version files (all four):         [PKG_VERSION]

  Either:
  (a) A release was tagged but the version files weren't bumped → bump files to match tag
  (b) Files were bumped but no tag was pushed → tag origin/main manually before releasing
  ```

If `LAST_TAG` is empty: this is the first release. Use `PKG_VERSION` as the base.

**INFRA-145 NOTE — legacy v2.x tag namespace collision**:

The repo has a pre-existing `v2.0.0` tag (published to origin) that points at an abandoned commit not on main's reachable history. If a user runs `/b-release major` from current v1.0.0, the computed next version would be `v2.0.0` — which would collide with the existing tag.

The skill MUST check before tagging in Phase 7.3:
```bash
if git ls-remote --tags origin "v$PKG_VERSION" | grep -q "v$PKG_VERSION"; then
  ABORT "v$PKG_VERSION already exists on origin as a legacy tag. Either:
    (a) Delete the legacy tag first: git push origin :refs/tags/v$PKG_VERSION
    (b) Pick a different bump (skip v2.x; use v3.0.0 for first major)
    (c) Force-update the tag (NOT recommended; rewrites release history)"
fi
```

For the FIRST `/b-release` run after INFRA-145 migration:
- `patch` → `v1.0.1` (safe, no collision)
- `minor` → `v1.1.0` (safe, no collision)
- `major` → `v2.0.0` (COLLIDES with legacy abandoned tag — defer / clean up first)

---

## Phase 5: Compute next version + bump all four sources

### 5.1 Compute

Parse `PKG_VERSION` as `MAJOR.MINOR.PATCH`. Compute next:
- `patch`: `MAJOR.MINOR.(PATCH+1)`
- `minor`: `MAJOR.(MINOR+1).0`
- `major`: `(MAJOR+1).0.0`

Compute next build number: `NEXT_BUILD = $((IOS_BUILD + 1))` (string).

### 5.2 Update all four sources (write strings everywhere per INFRA-141 schema)

```bash
NEXT_VERSION="X.Y.Z"  # computed above
NEXT_BUILD="N"        # computed above

# 1. app/package.json
cd /Users/max/dev/being/development/app
npm version --no-git-tag-version "$NEXT_VERSION"

# 2. app/app.json (Expo manifest)
jq --arg v "$NEXT_VERSION" --arg b "$NEXT_BUILD" \
   '.expo.version = $v | .expo.ios.buildNumber = $b | .expo.android.versionCode = ($b | tonumber)' \
   app.json > app.json.tmp && mv app.json.tmp app.json

# 3. .config/env.production
sed -i '' "s/^EXPO_PUBLIC_APP_VERSION=.*/EXPO_PUBLIC_APP_VERSION=$NEXT_VERSION/" /Users/max/dev/being/.config/.env.production
sed -i '' "s/^EXPO_PUBLIC_BUILD_NUMBER=.*/EXPO_PUBLIC_BUILD_NUMBER=$NEXT_BUILD/" /Users/max/dev/being/.config/.env.production

# 4. .config/env.development
sed -i '' "s/^EXPO_PUBLIC_APP_VERSION=.*/EXPO_PUBLIC_APP_VERSION=$NEXT_VERSION/" /Users/max/dev/being/.config/.env.development
sed -i '' "s/^EXPO_PUBLIC_BUILD_NUMBER=.*/EXPO_PUBLIC_BUILD_NUMBER=$NEXT_BUILD/" /Users/max/dev/being/.config/.env.development
```

**Note**: env files are NOT in any git worktree — they live at `~/dev/being/.config/`. Worktree symlinks point to these canonical files. Editing them affects every worktree's resolved env at once. That's intentional per CLAUDE.md "Known Gotchas".

### 5.3 Re-validate env schema

After editing env files, re-run the Phase 2.6 check to confirm the schema still parses:

```bash
cd /Users/max/dev/being/development/app
node -e "require('./src/core/config/env')" 2>&1
```

Abort if it fails — this catches a malformed sed substitution.

---

## Phase 6: Release commit + PR

### 6.1 Generate release notes

Find the last release tag (computed in Phase 4.2). List squash commits between that tag and HEAD of development:

```bash
if [ -n "$LAST_TAG" ]; then
  RANGE="$LAST_TAG..origin/development"
else
  # First release — get all commits on development
  RANGE="origin/development"
fi

git log $RANGE --no-merges --format='%s%n%b%n---' | head -200
```

Group commits by conventional commit prefix:

```markdown
## Features
- feat: <subject>
- ...

## Fixes
- fix: <subject>
- ...

## Chores
- chore: <subject>
- refactor: <subject>
- ...

## Tests
- test: <subject>
- ...

## Other
- <any commit without a recognized prefix>
```

Skip empty sections. If no commits found, use "(No changes since last release.)".

### 6.2 Create release branch + commit the version bump

**INFRA-145 update (post-first-release learning, 2026-05-24)**: `development`
branch protection requires PRs. Direct push to dev is rejected. So the version
bump must go on a separate branch and PR'd to dev.

```bash
cd /Users/max/dev/being/development
git checkout -b chore/release-v$NEXT_VERSION-bump
git add app/package.json app/package-lock.json app/app.json
git commit -m "chore(release): v$NEXT_VERSION version bump

Bump version across all four INFRA-141 sources:
- app/package.json
- app/app.json (Expo manifest + iOS buildNumber + Android versionCode)
- .config/env.production (untracked, edited in place)
- .config/env.development (untracked, edited in place)

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

**Note**: env files at `~/dev/being/.config/` are NOT tracked by git, so they aren't part of this commit. They're updated in place (single source of truth across worktrees).

### 6.3 Push release branch + bump PR + auto-merge to dev

```bash
git push -u origin chore/release-v$NEXT_VERSION-bump

BUMP_PR_URL=$(gh pr create \
  --base development \
  --head chore/release-v$NEXT_VERSION-bump \
  --title "chore(release): v$NEXT_VERSION version bump" \
  --body "Bumps all four INFRA-141 version sources from v$PKG_VERSION → v$NEXT_VERSION (build $IOS_BUILD → $NEXT_BUILD). This PR lands on \`development\`. After it merges, the dev → main release PR opens automatically.")

BUMP_PR_NUMBER=$(echo "$BUMP_PR_URL" | grep -oE '[0-9]+$')

# Wait for CI on the bump PR
gh pr checks $BUMP_PR_NUMBER --watch

# Merge the bump into dev
gh pr merge $BUMP_PR_NUMBER --merge --delete-branch --admin

# Sync local dev to match
BUMP_MERGE_SHA=$(gh pr view $BUMP_PR_NUMBER --json mergeCommit -q '.mergeCommit.oid')
git -C /Users/max/dev/being update-ref refs/heads/development $BUMP_MERGE_SHA
git fetch origin
git checkout development
git pull --rebase origin development
```

### 6.4 Open release PR

```bash
RELEASE_NOTES=$(cat <<'EOF'
[Generated release notes from Phase 6.1]

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)

PR_URL=$(gh pr create \
  --base main \
  --head development \
  --title "Release v$NEXT_VERSION" \
  --body "$RELEASE_NOTES")

PR_NUMBER=$(echo "$PR_URL" | grep -oE '[0-9]+$')
```

Display:
```
📬 Release PR opened: #[PR_NUMBER]
   URL: [PR_URL]
   Version: v[NEXT_VERSION]
   Build: [NEXT_BUILD]
```

### 6.5 Wait for CI

```bash
gh pr checks $PR_NUMBER --watch
```

(Same 9 strict gates as feature PRs. Typical 2-4 min.)

### 6.6 Merge with merge-commit strategy (decision #1)

```bash
gh pr merge $PR_NUMBER --merge --admin
```

**IMPORTANT**: `--merge` (NOT `--squash`). Preserves the per-tranche history on main — you can see "this release contained these 6 commits" via `git log --merges` on main.

**Do NOT** pass `--delete-branch` — development is long-lived.

### 6.7 Inform user

Display:
```
✅ Release v[NEXT_VERSION] merged to main!

Next: Run /b-release --finish to:
  - Tag origin/main as v[NEXT_VERSION]
  - Push the tag
  - Sync bare-repo local refs

(Or do it manually with: git tag v[NEXT_VERSION] origin/main && git push origin --tags)
```

STOP here. The user runs `/b-release --finish` after reviewing.

---

## Phase 7: --finish (post-merge tagging + sync)

### 7.1 Fetch latest (CRITICAL: separate calls)

**INFRA-145 update (post-first-release learning)**: `git fetch origin --tags`
fetches tags but does NOT refresh branch refs. You must do BOTH explicitly,
or the next step will tag a stale commit.

```bash
cd /Users/max/dev/being/development
git fetch origin main      # refresh origin/main ref
git fetch origin --tags    # refresh tags (in case other tags pushed elsewhere)
```

### 7.2 Determine version to tag

Re-read the current `PKG_VERSION` from `app/package.json` (the merge brought it onto main):

```bash
PKG_VERSION=$(jq -r '.version' /Users/max/dev/being/development/app/package.json)
```

Confirm it matches what's on origin/main (uses the refreshed ref from 7.1):

```bash
MAIN_PKG_VERSION=$(git show origin/main:app/package.json | jq -r '.version')
```

`MAIN_PKG_VERSION` must equal `PKG_VERSION`. If not, ABORT with
"version on origin/main ($MAIN_PKG_VERSION) doesn't match local ($PKG_VERSION);
did the release PR actually merge? Verify with: gh pr view <release-pr-num>"

### 7.3 Tag origin/main

**Pre-check for legacy tag collision** (per INFRA-145 / Phase 4.2 note):

```bash
if git ls-remote --tags origin "v$PKG_VERSION" | grep -q "refs/tags/v$PKG_VERSION$"; then
  echo "❌ Tag v$PKG_VERSION already exists on origin (likely a legacy abandoned tag)."
  echo ""
  echo "Resolve one of these ways before retrying --finish:"
  echo "  (a) Delete the legacy tag: git push origin :refs/tags/v$PKG_VERSION"
  echo "  (b) Bump the version files to skip the collision (e.g., manually edit to v3.0.0)"
  echo "  (c) Force-update (rewrites history; NOT recommended)"
  exit 1
fi
```

If pre-check passes:

```bash
git tag "v$PKG_VERSION" origin/main
git push origin "v$PKG_VERSION"
```

### 7.4 Sync bare-repo local refs

```bash
MAIN_SHA=$(git rev-parse origin/main)
git -C /Users/max/dev/being update-ref refs/heads/main $MAIN_SHA
```

### 7.5 Display

```
🎉 Release v[PKG_VERSION] complete!
   Tag pushed: v[PKG_VERSION] → [MAIN_SHA]
   Bare-repo main ref synced

Next: (Future) TestFlight build trigger via EAS / GitHub Action
```

---

## Error recovery

If anything in Phase 5 (version bump) fails partway, the version files may be in a half-edited state. Recover with:

```bash
cd /Users/max/dev/being/development
git restore app/package.json app/package-lock.json app/app.json
# For env files (untracked):
# Manually restore from the source values printed in the Phase 4 drift report
```

Then re-run `/b-release`.

---

## What this skill does NOT do

- **Pre-release tags** (`v1.0.0-rc.1`): skip until needed (decision #4).
- **GitHub Releases**: future enhancement. For now, the git tag is the release artifact.
- **TestFlight / EAS build trigger**: future enhancement. The plan was to add a GitHub Actions workflow `.github/workflows/release.yml` triggered on push to `main` that runs EAS submit. Not in scope for INFRA-145.
- **Cleanup of legacy git tags** (`v2.0.0`, etc.): defer. These don't interfere with the `--match 'v[0-9]*.[0-9]*.[0-9]*'` filter.

---

*File location: /Users/max/dev/being/.claude/commands/b-release.md*
