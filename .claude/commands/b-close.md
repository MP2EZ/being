# Close Work Item & Merge [META-COMMAND]

**WORK_ITEM_ID**: $ARGUMENTS (optional - will auto-detect from current branch if not provided)

**Database ID**: 277a1108c20880bda80dce2ec7d8a12e

---

## Phase 1: Validate & Align Context

### Step 1.1: Parse Arguments & Determine Work Item ID

**Parse command arguments**:
- Extract WORK_ITEM_ID (if provided)
- Extract flags: `--push`

**Examples**:
```bash
/b-close MAINT-79           # Close without push
/b-close MAINT-79 --push    # Close and push
/b-close --push             # Auto-detect work item, push
```

**Flag detection**:
```
args = [MAINT-79, --push]
→ WORK_ITEM_ID = MAINT-79
→ SHOULD_PUSH = true
```

**If WORK_ITEM_ID provided as argument**:
→ Use provided WORK_ITEM_ID (excluding --push flag)
→ Check remaining args for --push flag

**If no WORK_ITEM_ID provided**:
→ Auto-detect from current branch name
```bash
git branch --show-current
# Example: feat/FEAT-42-easy-navigation-home
# Extract: FEAT-42
```
→ Check args for --push flag

**Validation**:
- Pattern: `[TYPE]-[NUMBER]` (e.g., FEAT-42, DEBUG-15)
- If not found: Error "Cannot determine work item. Provide as argument: /b-close FEAT-42"

---

### Step 1.2: Query Notion for Work Item

```
mcp__notionApi__API-post-database-query
database_id: "277a1108c20880bda80dce2ec7d8a12e"
filter: {
  "property": "Work Item ID",
  "title": {
    "equals": "[WORK_ITEM_ID]"
  }
}
```

**Extract from response**:
- page_id
- Work Item Name
- Current Status
- Type

**Error handling**:
- If not found: "Work item [WORK_ITEM_ID] not found in Notion"
- If multiple: "Multiple items found - contact admin"

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
repo_path: "/Users/max/Development/active/being/.git"
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
repo_path: "/Users/max/Development/active/being/.git"
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
repo_path: "/Users/max/Development/active/being/.git"
message: [generated message]
```

**Display**:
```
✅ Changes committed
   Message: [first line of commit]
   Files: [count] files changed
```

---

## Phase 3: Merge to Development

### Step 3.1: Switch to Development Branch

```bash
cd /Users/max/Development/active/being/development
git checkout development
```

**Verify**:
```bash
git branch --show-current
# Should output: development
```

---

### Step 3.2: Merge Feature Branch

```bash
git merge [feature-branch-name] --no-ff -m "Merge [WORK_ITEM_ID]: [Name]

Closes [WORK_ITEM_ID]

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

**Example**:
```bash
git merge feat/FEAT-42-easy-navigation-home --no-ff -m "Merge FEAT-42: Ensure easy navigation to home

Closes FEAT-42

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

**Error handling**:
- If merge conflicts:
  ```
  ⚠️  Merge conflicts detected
     Files with conflicts: [list]

  Please resolve conflicts manually:
  1. cd ~/being/development
  2. Resolve conflicts in listed files
  3. git add [resolved-files]
  4. git commit
  5. Run /b-close [WORK_ITEM_ID] again (will skip merge step)
  ```

- If already merged:
  ```
  ℹ️  Branch already merged to development
     Skipping merge step
  ```

**Success**:
```
✅ Merged to development
   Branch: [feature-branch-name]
   Strategy: --no-ff (preserves feature branch history)
```

---

## Phase 4: Update Notion

### Step 4.1: Update Status to "Done"

```
mcp__notionApi__API-patch-page
page_id: [page_id from Phase 1]
properties: {
  "Status": {
    "status": {
      "name": "Done"
    }
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
mcp__notionApi__API-create-a-comment
parent: { page_id: [page_id from Phase 1] }
rich_text: [
  {
    text: {
      content: [comment content above]
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
cd /Users/max/Development/active/being
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

### Step 5.2: Push to Remote (Optional)

**If --push flag was provided**:

```bash
cd /Users/max/Development/active/being/development
git push
```

**Display**:
```
🚀 Pushing to remote...
   Branch: development
```

**Success**:
```
✅ Pushed to remote
   development: [old-commit]...[new-commit]
```

**Error handling**:
```
⚠️  Push failed: [error message]

   Push manually when ready:
   cd ~/being/development && git push
```

**If --push flag was NOT provided**:
```
ℹ️  Skip push (use --push flag to auto-push)
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
- Phase 3 interruption (merge conflicts): User resolves, re-runs command
- Phase 4 interruption (Notion): Re-run will update status/comment
- Phase 5.1 interruption (worktree): Manual cleanup if needed
- Phase 5.2 interruption (push): Re-run will attempt push again (idempotent)

**Safe to run multiple times**: Command checks state at each phase and skips completed steps.

---

*File location: ~/Development/active/being/.claude/commands/b-close.md*
