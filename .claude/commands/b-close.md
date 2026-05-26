# Close Work Item & Merge [META-COMMAND]

**WORK_ITEM_ID**: $ARGUMENTS (optional - will auto-detect from current branch if not provided)

**Database ID**: `${NOTION_WORK_DB}` (defined in `CLAUDE.md`)

**GitHub Flow note (INFRA-145)**: Closes the work item to `development` via PR
(no longer local-merge + push, because dev branch protection now requires PRs).
Does NOT promote to `main` — use `/b-release` for that. The `--push` flag is
deprecated (PR merge always pushes); accepted as a no-op for backward compat.

> 💡 For best flow: ensure Accept Edits mode is active (Shift+Tab to cycle).
> This skill makes multiple tool calls (Notion + git + gh CLI) per run.

---

## Phase 1: Validate & Align Context

### Step 1.1: Parse Arguments & Determine Work Item ID

**Parse command arguments**:
- Extract WORK_ITEM_ID (if provided)
- Extract flags: `--push`, `--skip-e2e`

**Examples**:
```bash
/b-close MAINT-79           # Close without push
/b-close MAINT-79 --push    # Close and push (--push is a no-op, kept for backcompat)
/b-close --push             # Auto-detect work item, push
/b-close MAINT-79 --skip-e2e  # Bypass Phase 2.5 Maestro gate (HOTFIX BRANCHES ONLY)
```

**Flag detection**:
```
args = [MAINT-79, --push]
→ WORK_ITEM_ID = MAINT-79
→ SHOULD_PUSH = true

args = [MAINT-79, --skip-e2e]
→ WORK_ITEM_ID = MAINT-79
→ SKIP_E2E = true
```

**`--skip-e2e` policy** (INFRA-171): mirrors `--no-verify` from CLAUDE.md. The
Phase 2.5 Maestro gate refuses to bypass on `feat/*`, `fix/*`, or `chore/*`
branches; only `hotfix/*` accepts it (with a loud warning). See Phase 2.5 below.

**If WORK_ITEM_ID provided as argument**:
→ Use provided WORK_ITEM_ID (excluding --push flag)
→ Check remaining args for --push flag

**If no WORK_ITEM_ID provided**:
→ Auto-detect from current branch or worktree

**Option A: From branch name** (when in worktree):
```bash
git branch --show-current
# Example: feat/FEAT-42-easy-navigation-home
# Extract: FEAT-42
```

**Option B: From worktree list** (when on bare repo):
```bash
git worktree list
# Find worktree matching context (e.g., maint-140)
# Uppercase: MAINT-140
```
→ Check args for --push flag

**Validation**:
- Pattern: `[TYPE]-[NUMBER]` (e.g., FEAT-42, DEBUG-15)
- If not found: Error "Cannot determine work item. Provide as argument: /b-close FEAT-42"

---

### Step 1.2: Query Notion for Work Item

**Derive Work Item ID from worktree**:
- Worktree name (lowercase): `maint-140`, `feat-42`
- Work Item ID (uppercase): `MAINT-140`, `FEAT-42`

**Search with explicit Work Item ID**:
```
mcp__notion__notion-search
query: "Work Item ID: [WORK_ITEM_ID]"
query_type: "internal"
```

**Example**: For worktree `maint-140`:
```
query: "Work Item ID: MAINT-140"
```

**Fetch full details**:
```
mcp__notion__notion-fetch
id: [page_id or URL from search result]
```

**Extract from fetch response**:
- page_id (from URL)
- Work Item Name (from properties)
- Current Status
- Type

**Validation**: Verify the page content contains `## Work Item ID:\n[WORK_ITEM_ID]` to confirm exact match.

**Error handling**:
- If not found: "Work item [WORK_ITEM_ID] not found in Notion"
- If multiple results: Fetch each and verify Work Item ID matches exactly

---

### Step 1.3: Validate Branch Alignment

**Check three sources**:
1. **Claude Code context**: Current git branch from system
2. **Actual git branch**: `git branch --show-current`
3. **Work item**: Type and Name from Notion

**Expected alignments**:
- Branch name pattern: `[prefix]/[WORK_ITEM_ID]-[slugified-name]`
- Prefix matches Type: FEAT→feat/, DEBUG→fix/, INFRA/MAINT/AGENT→chore/

**Validation scenarios**:

**A) All aligned** ✅:
```
✓ Branch: feat/FEAT-42-easy-navigation-home
✓ Work Item: FEAT-42
✓ Type: FEAT → feat/ prefix
✓ All aligned - proceeding
```

**B) Misalignment detected** ⚠️:
Display details and ask:
```
⚠️  Alignment issue detected:
   Current branch: feat/FEAT-41-navbar-updates
   Work item: FEAT-42: Ensure easy navigation to home

Options:
1. Continue anyway (you know what you're doing)
2. Cancel and fix manually
3. Auto-correct (checkout correct branch)

Choice (1/2/3)?
```

**Auto-correct option** (if user chooses 3):
```bash
# Find correct branch for work item
git branch --list "*FEAT-42*"
# If found: git checkout [correct-branch]
# If not found: Error "Branch for FEAT-42 not found"
```

---

## Phase 2: Commit Pending Changes

### Step 2.1: Check for Uncommitted Changes

```
mcp__git__git_status
repo_path: "/Users/max/dev/being/.git"
```

**Scenarios**:

**A) No changes**:
```
✓ No uncommitted changes
  Proceeding to merge
```
→ Skip to Phase 3

**B) Uncommitted changes exist**:
Display summary and prompt:
```
📝 Uncommitted changes found:
   Modified: [count] files
   New: [count] files

Commit these changes? (y/n/view)
- y: Stage and commit all changes
- n: Skip commit (WARNING: changes won't be merged)
- view: Show git diff
```

---

### Step 2.2: Stage & Commit Changes (if user confirms)

**Stage all changes**:
```
mcp__git__git_add
repo_path: "/Users/max/dev/being/.git"
files: ["."]
```

**Generate commit message**:
```
[type]: [WORK_ITEM_ID] [brief description from Notion Name]

[Optional: If testing feedback was provided in conversation, include it here]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Type mapping**:
- FEAT → `feat:`
- DEBUG → `fix:`
- INFRA/MAINT/AGENT → `chore:`

**Commit**:
```
mcp__git__git_commit
repo_path: "/Users/max/dev/being/.git"
message: [generated message]
```

**Display**:
```
✅ Changes committed
   Message: [first line of commit]
   Files: [count] files changed
```

---

## Phase 2.5: Safety e2e Gate (Maestro)

**INFRA-171**: Block push if the branch touches a user-visible safety surface
and the corresponding Maestro flow(s) fail. Local-only — no CI integration.
The gate is the only mechanical enforcement that the safety-surface contracts
(PHQ-9 Q9 single-alert, score-threshold completion banners, GAD-7 severe
handoff, crisis-button reachability, 988 dial path) hold end-to-end. Every
Jest test mocks `Alert.alert` and `Linking.canOpenURL`, so these contracts
are invisible to the rest of the test stack.

### Step 2.5.1: Detect safety-surface changes

```bash
SAFETY_CHANGED=$(git diff --name-only origin/development...HEAD | \
  grep -E '^app/(src/features/(assessment|crisis)|src/core/services/security|src/core/navigation/CleanRootNavigator|app\.json|ios/.*Info\.plist)' || true)
```

If empty → skip the gate:
```
ℹ️  No safety-surface changes detected — skipping Maestro e2e gate
```
Proceed to Step 3.1.

### Step 2.5.2: Honor `--skip-e2e` flag (hotfix-only)

If `SAFETY_CHANGED` is non-empty AND `SKIP_E2E=true`:

```bash
CURRENT_BRANCH=$(git branch --show-current)
case "$CURRENT_BRANCH" in
  hotfix/*)
    echo "⚠️  --skip-e2e on hotfix/* — bypassing Maestro gate."
    echo "   Document the reason in the PR body."
    # proceed to Step 3.1
    ;;
  *)
    echo "❌ --skip-e2e is only permitted on hotfix/* branches"
    echo "   (mirror of --no-verify policy from CLAUDE.md)."
    echo "   Run Maestro flows (npm run e2e:safety) or rebase onto a"
    echo "   hotfix/* branch if this is genuinely urgent."
    exit 1
    ;;
esac
```

### Step 2.5.3: Map changed paths to scoped flow(s)

Avoids running all 5 flows on every safety touch (~3-4 min full run trains
`--skip-e2e` reflex). Match changed paths to the minimal set of flows that
pin the surfaces affected.

```bash
SCRIPTS=()
echo "$SAFETY_CHANGED" | grep -q 'src/features/crisis/' && \
  SCRIPTS+=("e2e:safety:crisis-button" "e2e:safety:988-dial")
echo "$SAFETY_CHANGED" | grep -q 'src/features/assessment/' && \
  SCRIPTS+=("e2e:safety:q9" "e2e:safety:phq9" "e2e:safety:gad7")
echo "$SAFETY_CHANGED" | grep -qE 'app\.json|Info\.plist' && \
  SCRIPTS+=("e2e:safety:988-dial")
echo "$SAFETY_CHANGED" | grep -qE 'src/core/services/security|CleanRootNavigator' && \
  SCRIPTS=("e2e:safety")  # full suite — cross-cutting change, override scope

# Dedupe
SCRIPTS=($(printf "%s\n" "${SCRIPTS[@]}" | sort -u))
```

### Step 2.5.4: Verify simulator readiness

```bash
if ! xcrun simctl list devices booted | grep -qE '\([A-F0-9-]+\) \(Booted\)'; then
  echo "❌ No iOS simulator booted."
  echo "   Run 'npm run ios' first to build + install Being on a sim, then retry /b-close."
  exit 1
fi
if ! xcrun simctl listapps booted 2>/dev/null | grep -q com.being.app; then
  echo "❌ com.being.app not installed on booted sim."
  echo "   Run 'npm run ios' first, then retry /b-close."
  exit 1
fi
```

Do NOT auto-boot or auto-build — these are 60-90s detours mid-close. Defer
to the user.

### Step 2.5.5: Run the scoped flows

```bash
cd /Users/max/dev/being/[worktree-dir]/app
for script in "${SCRIPTS[@]}"; do
  echo "🛡️  Running: npm run $script"
  if ! npm run "$script"; then
    echo "❌ Maestro flow '$script' failed."
    echo "   Fix the issue, or — on a hotfix/* branch only — re-run with --skip-e2e."
    echo "   Debug a single flow with: maestro test .maestro/<flow>.yaml --debug"
    exit 1
  fi
done
echo "✅ All scoped Maestro safety flows passed (${#SCRIPTS[@]} script(s))"
```

Proceed to Step 3.1 only on success.

---

## Phase 3: PR + Merge to Development

**GitHub Flow note** (INFRA-145): `development` branch protection requires PRs.
Direct local-merge-then-push is no longer possible. b-close now opens a PR,
waits for CI, then merges via `gh pr merge`.

### Step 3.1: Sync Feature Branch with origin/development

GitHub branch protection requires "branches up to date before merging." If the
feature branch is behind `origin/development` at merge time, GitHub invalidates
the existing CI checks (treats them as having run against a stale base) and
refuses the merge with `Required status check "CI pass" is expected` — **even
with `--admin`** (admin bypasses approvals but not stale-check invalidation).
Sync locally first so the push in Step 3.2 carries the merge commit and CI
runs once against the correct base.

```bash
cd /Users/max/dev/being/[worktree-dir]
git fetch origin

BEHIND=$(git rev-list --count HEAD..origin/development)
if [ "$BEHIND" -gt 0 ]; then
  echo "🔄 Feature branch is $BEHIND commits behind origin/development; merging..."
  if ! git merge origin/development --no-edit; then
    echo "❌ Merge conflict with origin/development."
    echo "   Resolve conflicts in the worktree, then:"
    echo "     git add <resolved files>"
    echo "     git commit              # accept default 'Merge branch ...' subject"
    echo "     /b-close [WORK_ITEM_ID] # idempotent — re-runs from here"
    exit 1
  fi
  echo "✅ Synced (merge commit created locally; will be pushed in Step 3.2)"
else
  echo "✓ Already up to date with origin/development"
fi
```

**Why local-merge over `gh pr update-branch` post-PR:**
- Surfaces conflicts in the worktree *before* opening a noisy PR.
- One CI cycle instead of two — saves ~3–4 minutes per BEHIND occurrence.
- The push in Step 3.2 carries both the feature commit(s) and the merge
  commit in a single shot.

---

### Step 3.2: Push Feature Branch

From the feature worktree (where the implementation work happened):

```bash
cd /Users/max/dev/being/[worktree-dir]
git push -u origin [feature-branch-name]
```

**Display**:
```
🚀 Pushed feature branch to origin
   Branch: [feature-branch-name]
```

---

### Step 3.3: Open PR Targeting Development

```bash
gh pr create \
  --base development \
  --head [feature-branch-name] \
  --title "[type]: [WORK_ITEM_ID] [Name from Notion]" \
  --body "$(cat <<'EOF'
Closes [WORK_ITEM_ID]

[Brief description from work item User Story or Acceptance Criteria]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Type-to-prefix mapping** (same as commit message):
- FEAT → `feat:`
- DEBUG → `fix:`
- INFRA/MAINT/AGENT → `chore:`

**Capture PR number** from the output URL (e.g., `https://github.com/MP2EZ/being/pull/42` → PR #42).

**Display**:
```
📬 PR opened: #[PR_NUMBER]
   URL: [PR URL]
   Base: development
   Head: [feature-branch-name]
```

---

### Step 3.4: Wait for CI

```bash
gh pr checks [PR_NUMBER] --watch
```

This blocks until all 9 strict CI gates complete. Typical: 2-4 minutes.

**Display while waiting**:
```
⏳ Waiting for CI (9 strict gates)...
```

**On success**:
```
✅ All CI gates passed
```

**On failure**:
```
❌ CI failed on PR #[PR_NUMBER]
   Investigate: [PR URL]/checks

   To re-trigger after a fix:
   1. Push another commit to [feature-branch-name]
   2. Re-run /b-close [WORK_ITEM_ID]
```

(STOP here on failure — do not proceed to merge.)

---

### Step 3.5: Merge via gh pr merge

Use **merge commit** strategy (preserves feature branch history, matches the
prior `--no-ff` behavior). Use `--admin` to bypass the "branch up-to-date with
base" requirement for solo workflow speed.

```bash
gh pr merge [PR_NUMBER] \
  --merge \
  --delete-branch \
  --admin
```

**Display**:
```
✅ Merged PR #[PR_NUMBER] to development
   Strategy: merge commit (preserves feature branch history)
   Feature branch deleted on remote
```

**Capture merge commit SHA**:
```bash
MERGE_SHA=$(gh pr view [PR_NUMBER] --json mergeCommit -q '.mergeCommit.oid')
```

---

### Step 3.6: Sync Bare-Repo + Worktree (POST-MERGE)

After GitHub merges, the local bare-repo's `refs/heads/development` is stale.
Update it explicitly + pull the development worktree into sync.

```bash
# Sync the development worktree to match origin.
# Because dev is checked out in a worktree, refs/heads/development IS the
# worktree's branch ref; the pull updates the bare-repo's ref as a side
# effect, so no explicit update-ref is needed.
# Use --ff-only: after a remote merge of a fresh feature branch the worktree
# is strictly behind origin, so fast-forward is the only correct outcome.
# --rebase would silently replay any unexpected local dev commits, which is
# never what we want here.
git -C /Users/max/dev/being/development fetch origin
git -C /Users/max/dev/being/development pull --ff-only origin development
```

**Display**:
```
🔄 Synced bare-repo + development worktree
   refs/heads/development → [MERGE_SHA]
```

**Error handling**:
- If `pull --ff-only` fails (not a fast-forward): ABORT with message
  "development worktree has unrelated local commits; resolve manually before
  next b-close". Do NOT auto-rebase — unexpected dev commits should be
  surfaced, not silently absorbed.

---

### Step 3.7: Verify remote feature branch was deleted

`gh pr merge --delete-branch` (Step 3.5) silently skips its branch-delete API
call when its local-checkout step fails — which it always does in our
bare-repo + worktrees setup because `development` is held by the dev worktree
(`fatal: 'development' is already used by worktree at …`). This defensive
check catches that and cleans up.

```bash
if git ls-remote origin "refs/heads/[feature-branch-name]" | grep -q .; then
  echo "ℹ️  Feature branch still on origin (gh --delete-branch skipped); cleaning up"
  git push origin --delete [feature-branch-name]
  echo "🗑️  Deleted [feature-branch-name] from origin"
else
  echo "✓ Feature branch already removed from origin"
fi
```

Idempotent — safe to re-run. Do NOT remove the `--delete-branch` flag from
Step 3.5: in workflows where gh's local-checkout succeeds (no worktree on the
base branch), the flag still works and this step becomes a confirmation.

---

## Phase 4: Update Notion

### Step 4.1: Update Status to "Done"

```
mcp__notion__notion-update-page
data: {
  "page_id": "[page_id from Phase 1]",
  "command": "update_properties",
  "properties": {
    "Status": "Done"
  }
}
```

---

### Step 4.2: Add Completion Comment

**Generate timestamp**: Current date/time in format: `2025-10-03 19:45 PDT`

**Comment content**:
```
✅ Closed via /b-close

📅 Completed: [timestamp]
🌿 Branch: [feature-branch-name]
🔀 Merged to: development
📊 Commits: [commit count if available]

[Optional: Include testing notes/feedback from conversation]

---
🤖 Automated by Claude Code
```

**Create comment**:
```
mcp__notion__notion-create-comment
parent: { "page_id": "[page_id from Phase 1]" }
rich_text: [
  {
    "type": "text",
    "text": {
      "content": "[comment content above]"
    }
  }
]
```

---

## Phase 5: Cleanup & Summary

### Step 5.1: Ask About Worktree Cleanup

```
🌿 Branch merged successfully!

Remove worktree directory? (y/n/later)
- y: Remove worktree now
- n: Keep worktree for reference
- later: Keep for now, remind me

Worktree: ~/being/[worktree-dir]/
```

**If user chooses "y"**:
```bash
cd /Users/max/dev/being
git worktree remove [worktree-dir] --force
```

**Display**:
```
🗑️  Worktree removed: [worktree-dir]
```

**If user chooses "later"**:
Add to Notion comment:
```
📝 Note: Worktree still exists at ~/being/[worktree-dir]
   Run manually when ready: git worktree remove [worktree-dir]
```

---

### Step 5.2: Push to Remote (DEPRECATED — kept for backward compat)

**INFRA-145 GitHub Flow note**: This step is now a no-op. The PR merge in
Phase 3.5 already pushes development to origin via the GitHub API. The
`--push` flag is accepted as a no-op for backward compatibility with prior
invocations.

```
ℹ️  Push handled automatically by gh pr merge (Phase 3.5). No action needed.
```

---

### Step 5.3: Final Summary

```
✅ [WORK_ITEM_ID] closed successfully!

Summary:
  Status: Done
  Branch: [feature-branch-name]
  Merged to: development
  Notion updated: ✓
  Worktree: [removed/kept]
  Pushed to remote: [✓ / -]

Next steps:
  [If NOT pushed]
  - Push to remote: cd ~/being/development && git push

  [If pushed]
  - Remote updated ✓

  - Continue with next item: /b-work [NEXT-ITEM]
```

---

## Error Recovery

**If command interrupted mid-execution**:
- Phase 1-2 interruption: Safe to re-run (idempotent)
- Step 3.1 interruption (conflict merging origin/development): User resolves conflicts in the worktree, commits the merge with the default `Merge branch ...` subject, then re-runs `/b-close` — sync step will see BEHIND=0 and continue from Step 3.2
- Phase 3 interruption (PR merge conflicts): User resolves on GitHub or locally, re-runs command
- Phase 3.7 interruption (branch cleanup): Safe to re-run; check is idempotent
- Phase 4 interruption (Notion): Re-run will update status/comment
- Phase 5.1 interruption (worktree): Manual cleanup if needed
- Phase 5.2 interruption (push): Re-run will attempt push again (idempotent)

**Safe to run multiple times**: Command checks state at each phase and skips completed steps.

---

*File location: /Users/max/dev/being/.claude/commands/b-close.md*
