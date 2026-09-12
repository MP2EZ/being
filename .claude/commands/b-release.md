# Promote Development → Main as a Release [META-COMMAND]

**ARGUMENTS**: `[BUMP] [--finish]`

**BUMP**: `patch` | `minor` | `major` — optional. If not provided, the skill
**interactively prompts** for it. Once you're comfortable with the flow,
pass explicitly to skip the prompt.

**--finish**: **Recovery entry point only — a normal release is one command.**
Phase 7 (tag + push tag + sync the bare-repo's local `refs/heads/main`) runs
inline after the merge. `--finish` re-enters at Phase 7 for the case where the
merge landed but tagging did not — a 7.2 version mismatch, a 7.3 legacy-tag
collision, or an interrupted run.

This used to be a mandatory second invocation. It was not a technical wait:
Phase 6.6 does the merge itself via `gh pr merge --admin`, so nothing is
pending between merge and tag. The split dated from when the PR was merged by
hand in the browser and was never collapsed after 6.6 took that over.

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
/b-release --finish        # RECOVERY ONLY: merge landed but tagging did not
```

A normal release is a single `/b-release` invocation, start to tag.

---

## Phase 1: Argument parsing

Parse `$ARGUMENTS`:
- If contains `--finish`: recovery re-entry. Skip to Phase 7. (Phases 2–6 are
  skipped wholesale — this path assumes the release PR already merged.)
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
# (1) Real divergence: non-merge commits on main with no patch-equivalent on dev.
git log --oneline --cherry-pick --right-only --no-merges development...origin/main
# (2) Evil merge: a merge whose tree carries content present in NEITHER parent.
for m in $(git rev-list --merges development..origin/main); do
  [ -n "$(git show --cc --format= "$m")" ] && git log -1 --oneline "$m"
done
```

Both must be empty. The **three** dots in (1) and **two** in (2) are not interchangeable.

**Do not simplify this to `git log development..origin/main`.** Phase 6.6 merges the
release PR with `--merge` (not `--squash`), so every release leaves a merge commit on
`main` that `development` never sees — zero unique content, present by construction. A
naive range therefore aborts on every release after the first. `--no-merges` alone is
not sufficient either: the Hotfix Process cherry-picks onto `development`, which
rewrites the SHA, so a *reachability* query stays red permanently even after the
operator has complied. Only `--cherry-pick --right-only` (patch-id equivalence) clears.

If (1) is non-empty — ABORT with:
"main carries commits dev doesn't. Cherry-pick the SHAs listed above onto development,
oldest first (`git cherry-pick <sha> [<sha> ...]`), land them via the backport PR in
CLAUDE.md's Hotfix Process, then retry /b-release.
Never `git cherry-pick origin/main` — main's tip is normally a release merge commit;
cherry-pick refuses it without `-m`, and forcing it produces an empty commit."

If (2) is non-empty — ABORT with:
"merge commit(s) on main carry content in neither parent (a conflict resolved in the
GitHub UI). Reconcile that content onto development by hand before releasing."

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
for ENV_FILE in .env.production .env.development; do
  OUT=$(node --env-file="$ENV_FILE" \
        -e "require('./src/core/config/env.ts'); console.log('ENV_OK ' + process.env.EXPO_PUBLIC_ENV)" 2>&1)
  RC=$?
  if [ $RC -ne 0 ] || ! printf '%s' "$OUT" | grep -q '^ENV_OK '; then
    echo "❌ $ENV_FILE failed INFRA-141 schema validation (exit $RC):"
    printf '%s\n' "$OUT"
    exit 1
  fi
  echo "✅ $ENV_FILE — $OUT"
done
```

Three parts are load-bearing; the version without them could never pass:

- **`.ts` is required.** Node's CJS resolver never appends it, so the bare
  `require('./src/core/config/env')` this used to run exits `MODULE_NOT_FOUND`
  whatever the env contains.
- **`--env-file` is required.** `EXPO_PUBLIC_*` reach the app through Metro at
  bundle time, never `process.env`. Without it every var reads `undefined` and a
  correct config fails. Worktree `.env.*` are symlinks to `.config/.env.*`.
- **`ENV_OK` is the positive assertion.** A silent exit 0 from the wrong
  directory is not a pass — same family as the "empty result from a filtered
  test run is not a pass" rule. Positive `grep -q` is safe here; `grep -qv` is
  not (the shell snapshot's ugrep wrapper inverts it).

Validate BOTH: Phase 5.2 edits both files, so a `sed` that mangles only the
development one would otherwise ship unseen.

Non-zero exit means a var is missing or out of range. ABORT and surface the Zod
error verbatim — the issue-formatter at `env.ts:310-317` redacts received values
for compliance, so it is safe to display.

### 2.7 No standing red on a scheduled workflow

```bash
gh run list --branch development --event schedule --limit 30 \
  --json workflowName,conclusion,createdAt \
  -q 'group_by(.workflowName)[] | max_by(.createdAt) | select(.conclusion != "success") | "\(.workflowName)\t\(.conclusion)\t\(.createdAt)"'
```

Must print nothing. A scheduled workflow is the only thing watching state this
repo does not own — the live site, main's health, Supabase liveness — and a red
one means a claim the release is about to make is already false.

`Legal Site Freshness` was red for 13 consecutive days before a release PR
happened to run it and blocked the release mid-flight. Nothing surfaces these
except looking.

If a row prints, fix or consciously accept it BEFORE bumping. Re-run the failing
workflow to confirm green rather than trusting a stale conclusion.

### 2.8 Native dependency drift since the last tag

```bash
cd /Users/max/dev/being
LAST_TAG=$(git -C development describe --tags --abbrev=0 origin/main \
             --match 'v[0-9]*.[0-9]*.[0-9]*' --exclude '*-*')
diff <(git -C development show "${LAST_TAG}:app/package-lock.json" \
        | jq -r '.packages | to_entries[] | select(.key|startswith("node_modules/")) | "\(.key) \(.value.version)"' | sort) \
     <(jq -r '.packages | to_entries[] | select(.key|startswith("node_modules/")) | "\(.key) \(.value.version)"' \
        development/app/package-lock.json | sort) \
  | grep -E '^[<>].*(expo|react-native)' || echo "no native dependency movement"
```

The braces in `${LAST_TAG}` are load-bearing. In zsh, `"$LAST_TAG:app/..."`
parses `:a` as a parameter modifier, so the ref silently becomes
`v1.2.1pp/package-lock.json`, `git show` fails, and the diff reports every
package as added — a wall of output that looks like a finding and is noise.

Informational, not an abort. Read it for **resolved** versions that moved while
`package.json` stayed put — a `~`/`^` range lets a patch bump add a native API
with no reviewable diff. That is exactly how `expo-file-system` 56.0.7 → 56.0.9
introduced a `PHPhotoLibrary` call and got v1.2.0 rejected with ITMS-90683.

`app/__tests__/safety/nativePurposeStrings.config.test.ts` now fails closed on
the permission half of this in precommit and CI. This step is for the rest —
anything else a native bump can change that no gate models yet.

### 2.9 Attended crisis device checklist (INFRA-591)

No Maestro can run a flow on a physical iPhone (DEBUG-589). That makes this the only
hardware check of the 988 dial and the keyboard accessory. It runs here, before anything
is bumped, because a failure after 6.3 would strand a merged bump on `development`.

Follow `docs/testing/crisis-device-checklist.md` exactly. It owns the steps, the pass/fail
rules and the result block. Do not restate them here.

```bash
cd /Users/max/dev/being/development
TESTED_SHA=$(git rev-parse origin/development)
PREV_WAIVED=$(gh pr list --base main --head development --state merged --limit 1 --json body \
  -q '(.[0].body // "") | test("Result:\\s+WAIVED")')
echo "TESTED_SHA=${TESTED_SHA}  previous release waived: ${PREV_WAIVED}"
```

Stop and ask the operator to build `TESTED_SHA` for their iPhone and run the checklist's §2
and §3. Wait for the device model, the iOS version and each step's result. Never ask the
operator for the SHA.

- **Any FAIL:** ABORT. Nothing has been bumped yet.
- **WAIVED:** accept it only when no qualifying iPhone is available. ABORT if `PREV_WAIVED`
  is `true`.
- **Otherwise:** fill in the checklist's §5 block as `CHECKLIST_BLOCK` for 6.4.

**Binding check.** 6.4 and 6.6 re-run this block with `SHIP_SHA` set to the tree about to
ship. It passes only when that tree differs from `TESTED_SHA` in version fields and nothing
else. A filename allowlist is not enough, because `app/app.json` also carries
`LSApplicationQueriesSchemes`.

```bash
cd /Users/max/dev/being/development && git fetch origin --quiet
BIND=ok
OTHERS=$(git diff --name-only "${TESTED_SHA}" "${SHIP_SHA}" | awk '!/^app\/(app|package|package-lock)\.json$/')
[ -z "$OTHERS" ] || BIND="files beyond the bump changed: $(printf '%s' "$OTHERS" | tr '\n' ' ')"
for spec in 'app/app.json|del(.expo.version, .expo.ios.buildNumber, .expo.android.versionCode)' \
            'app/package.json|del(.version)' \
            'app/package-lock.json|del(.version, .packages[""].version)'; do
  f=${spec%%|*}; filt=${spec#*|}
  [ "$BIND" = ok ] || break
  [ "$(git show "${TESTED_SHA}:${f}" | jq -S "$filt")" = "$(git show "${SHIP_SHA}:${f}" | jq -S "$filt")" ] \
    || BIND="${f} changed beyond its version fields"
done
echo "binding: ${BIND}"
```

**Anything but `binding: ok` is an ABORT.** That includes a fix pushed onto the bump branch
to turn its CI green. Do not re-run `/b-release`, which would bump a second time. Instead,
re-run the checklist against the new `origin/development`, set `TESTED_SHA` to it, and
resume at the step that failed.

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

# Source 3: .config/.env.production
ENV_PROD_VERSION=$(grep '^EXPO_PUBLIC_APP_VERSION=' /Users/max/dev/being/.config/.env.production | cut -d'=' -f2)
ENV_PROD_BUILD=$(grep '^EXPO_PUBLIC_BUILD_NUMBER=' /Users/max/dev/being/.config/.env.production | cut -d'=' -f2)

# Source 4: .config/.env.development
ENV_DEV_VERSION=$(grep '^EXPO_PUBLIC_APP_VERSION=' /Users/max/dev/being/.config/.env.development | cut -d'=' -f2)
ENV_DEV_BUILD=$(grep '^EXPO_PUBLIC_BUILD_NUMBER=' /Users/max/dev/being/.config/.env.development | cut -d'=' -f2)
```

### 4.1 Drift check

All four version strings (`PKG_VERSION`, `APP_VERSION`, `ENV_PROD_VERSION`, `ENV_DEV_VERSION`) must be identical. If any disagree:

```
❌ Version drift detected — refusing to release.

  app/package.json:                 [PKG_VERSION]
  app/app.json:                     [APP_VERSION]
  .config/.env.production:           [ENV_PROD_VERSION]
  .config/.env.development:          [ENV_DEV_VERSION]

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

# 3. .config/.env.production
sed -i '' "s/^EXPO_PUBLIC_APP_VERSION=.*/EXPO_PUBLIC_APP_VERSION=$NEXT_VERSION/" /Users/max/dev/being/.config/.env.production
sed -i '' "s/^EXPO_PUBLIC_BUILD_NUMBER=.*/EXPO_PUBLIC_BUILD_NUMBER=$NEXT_BUILD/" /Users/max/dev/being/.config/.env.production

# 4. .config/.env.development
sed -i '' "s/^EXPO_PUBLIC_APP_VERSION=.*/EXPO_PUBLIC_APP_VERSION=$NEXT_VERSION/" /Users/max/dev/being/.config/.env.development
sed -i '' "s/^EXPO_PUBLIC_BUILD_NUMBER=.*/EXPO_PUBLIC_BUILD_NUMBER=$NEXT_BUILD/" /Users/max/dev/being/.config/.env.development
```

**Note**: env files are NOT in any git worktree — they live at `~/dev/being/.config/`. Worktree symlinks point to these canonical files. Editing them affects every worktree's resolved env at once. That's intentional per CLAUDE.md "Known Gotchas".

### 5.3 Re-validate env schema

Re-run the **Phase 2.6 block verbatim** — both files, same positive assertion.
Do not restate the command here; a second copy is how the two drift apart.

Abort if it fails. This is the step that catches a malformed `sed` substitution:
`EXPO_PUBLIC_APP_VERSION` is `z.string().min(1)`, so a substitution that blanks
the value fails here rather than shipping.

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
- .config/.env.production (untracked, edited in place)
- .config/.env.development (untracked, edited in place)

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

# Wait for CI on the bump PR, then VERIFY against the rollup — `--watch` alone is
# not a verdict (INFRA-329: it exits all-green having read only one of several runs
# on the commit). The bump branch is chore/*, which CI's `push:` trigger no longer
# covers, so the only run is the one `gh pr create` just triggered — hence the
# register-wait before --watch.
for i in $(seq 1 30); do
  gh pr checks $BUMP_PR_NUMBER >/dev/null 2>&1 && break
  sleep 5
done
gh pr checks $BUMP_PR_NUMBER --watch || true

# Verdict is jq-only, never `grep -qv`: Claude Code's shell snapshot aliases grep
# to a ugrep wrapper whose `-q` + `-v` exit status is inverted vs system grep, so a
# grep-based gate reads a red rollup as GREEN. (Positive `grep -q` is unaffected.)
gh pr view $BUMP_PR_NUMBER --json statusCheckRollup \
  -q '.statusCheckRollup[] | "\(.name)\t\(.conclusion // .state)"' | sort
BUMP_VERDICT=$(gh pr view $BUMP_PR_NUMBER --json statusCheckRollup -q '
  [.statusCheckRollup[] | (.conclusion // .state)]
  | if length == 0 then "EMPTY"
    elif all(. == "SUCCESS" or . == "NEUTRAL" or . == "SKIPPED") then "GREEN"
    else "RED" end')
if [ "$BUMP_VERDICT" != "GREEN" ]; then
  echo "❌ Bump PR #$BUMP_PR_NUMBER is $BUMP_VERDICT — STOP. Do not merge or tag."
  exit 1
fi

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

First re-run the Phase 2.9 binding check with `SHIP_SHA=$(git rev-parse origin/development)`,
and ABORT unless it prints `binding: ok`.

```bash
RELEASE_NOTES=$(cat <<'EOF'
[CHECKLIST_BLOCK from Phase 2.9]

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

Same 9 strict gates as feature PRs. Typical 2-4 min.

**This is the one PR where two runs per gate is still normal, so the rollup check
matters most here.** The release PR's head is `development`, which CI's `push:`
trigger still covers (feature branches were dropped from it; `main` and
`development` were kept for the post-merge integration signal). So this commit
carries a push-triggered run AND a pull_request-triggered run — the exact INFRA-329
condition where `gh pr checks --watch` can exit all-green having read only one.
Never merge a release on `--watch`'s exit status.

```bash
gh pr checks $PR_NUMBER --watch || true

# Verdict is jq-only, never `grep -qv` — see the bump-PR block above for why.
gh pr view $PR_NUMBER --json statusCheckRollup \
  -q '.statusCheckRollup[] | "\(.name)\t\(.conclusion // .state)"' | sort
VERDICT=$(gh pr view $PR_NUMBER --json statusCheckRollup -q '
  [.statusCheckRollup[] | (.conclusion // .state)]
  | if length == 0 then "EMPTY"
    elif all(. == "SUCCESS" or . == "NEUTRAL" or . == "SKIPPED") then "GREEN"
    else "RED" end')
if [ "$VERDICT" != "GREEN" ]; then
  echo "❌ Release PR #$PR_NUMBER is $VERDICT — STOP. Do not merge, do not tag."
  exit 1
fi
```

Expect **two rows per gate** here (one run each from `push` and `pull_request`).
Both must be SUCCESS. A gate that is green in one row and red in the other is red —
a flake in either run is a real red that `gh pr merge` will refuse on, and a release
is the worst place to discover that from a misread `--watch`.

### 6.6 Merge with merge-commit strategy (decision #1)

The release PR's head is the live `development` branch, so anything merged during 6.5 would
ship untested. Pin the head, re-run the Phase 2.9 binding check with that `SHIP_SHA`, and
ABORT unless it prints `binding: ok`. `--match-head-commit` refuses the merge if the head
moves after the check.

```bash
SHIP_SHA=$(gh pr view $PR_NUMBER --json headRefOid -q .headRefOid)
# ... Phase 2.9 binding check ...
gh pr merge $PR_NUMBER --merge --admin --match-head-commit "$SHIP_SHA"
```

**IMPORTANT**: `--merge` (NOT `--squash`). Preserves the per-tranche history on main — you can see "this release contained these 6 commits" via `git log --merges` on main.

**Do NOT** pass `--delete-branch` — development is long-lived.

### 6.7 Inform user

Display:
```
✅ Release v[NEXT_VERSION] merged to main. Tagging…
```

**Do NOT stop here — continue straight into Phase 7.** `gh pr merge --admin`
returns only once the merge has landed, so there is nothing to wait for.

---

## Phase 7: Tag + sync

Runs inline after Phase 6. `--finish` re-enters here after a failure below —
see the recovery note on that flag at the top of this file.

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

**Reaching this abort inline means the merge succeeded and only tagging did
not** — Phase 6.6 already landed it. Do not re-run `/b-release`, which would
attempt a second bump and a second PR. Resolve the mismatch, then re-enter with
`/b-release --finish`. Same for a 7.3 tag collision.

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

### 7.4 Sync the bare repo's `main` ref

```bash
MAIN_SHA=$(git rev-parse origin/main)
git -C /Users/max/dev/being update-ref refs/heads/main $MAIN_SHA
```

**This is only correct because nothing has `main` checked out.** `update-ref`
advances the pointer without touching a worktree, so if a `main` worktree ever
exists again this silently desyncs it: HEAD jumps to the release while the index
and files stay at the previous one, and every commit in between reads as a
staged change. That happened for as long as a `main` worktree existed — six
weeks of history surfaced as ~130 staged adds, deletes and modifications after
v1.2.1, and `eas.json`'s `requireCommit: true` fails any build from such a
worktree with a message that never names the worktree.

If someone adds a `main` worktree, this step must become
`git -C <worktree> fetch origin main && git -C <worktree> merge --ff-only origin/main`.
Do not leave it as `update-ref`. Inspecting shipped state does not need a
standing worktree — create one on demand and remove it after.

### 7.5 Display

```
🏷️  Release v[PKG_VERSION] tagged — NOT yet shipped.
   Tag pushed: v[PKG_VERSION] → [MAIN_SHA]
   Bare-repo main ref synced

Continuing to Phase 8: watching the TestFlight build.
```

Do not print "complete" here. The tag is not the deliverable — the binary is,
and every failure between the two is invisible from this point.

---

## Phase 8: Watch the release build to a real verdict

Pushing the tag does not ship anything. `release.yml` fires on push to `main`
and runs the EAS build; the deliverable is a binary in TestFlight, and ~3.5
hours of the v1.2.0 release lived entirely after the point this skill used to
declare success.

### 8.1 Wait for the release workflow

```bash
cd /Users/max/dev/being/development
sleep 20
RID=$(gh run list --branch main --workflow "Release - iOS TestFlight" --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$RID" --exit-status; echo "release.yml exit=$?"
```

Since the `--no-wait` removal, this job carries the build's verdict rather than
the scheduling's. A red run here means no binary was produced — read the failing
step. It does **not** invalidate the tag: a build-environment failure (an
expired EAS `GITHUB_TOKEN` is the one with precedent) is fixed and the workflow
re-run against the same tag. Do NOT cut a new version for it.

### 8.2 Confirm the artifact independently

```bash
cd /Users/max/dev/being/development/app
npx eas build:list --platform ios --limit 1 --json --non-interactive \
  | jq -r '.[] | "\(.status)  v\(.appVersion)  \(.gitCommitHash[0:8])  \(.artifacts.applicationArchiveUrl // "no artifact")"'
```

Status must be `FINISHED` with a real archive URL. Check this even on a green
run — it is the record of what was actually built.

### 8.3 State the gap that remains

Apple processes the uploaded binary asynchronously and reports **only** by email
/ App Store Connect. A successful upload is not an accepted build: ITMS-90683
rejected v1.2.0 minutes after a fully green submit. Nothing here can gate that.

```
✅ Release v[PKG_VERSION] built and uploaded.
   Apple processing is pending and is reported only by email.
   Verify: https://appstoreconnect.apple.com/apps/6777579207/testflight/ios
```

If Apple rejects: the fix is a code/config change, so it needs a new patch
version — the tagged tree cannot produce a valid binary and must not be the
shipped one.

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
