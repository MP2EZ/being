# Being Work Item Executor [META-COMMAND]

**ARGUMENTS**: $ARGUMENTS

**Format**: `[Work Item ID] - [Additional context]`

**Database ID**: `${NOTION_WORK_DB}` (defined in `.claude/CLAUDE.md`)

---

## Phase 0: Parse Arguments

### Step 0.1: Extract Work Item ID and Additional Context

Parse `$ARGUMENTS` to extract two components:

**If $ARGUMENTS contains " - " (space-dash-space)**:
- **WORK_ITEM_ID**: Everything before " - "
- **ADDITIONAL_CONTEXT**: Everything after " - "

**If $ARGUMENTS does NOT contain " - "**:
- **WORK_ITEM_ID**: $ARGUMENTS (entire string)
- **ADDITIONAL_CONTEXT**: null

**Examples**:
- Input: `FEAT-42 - Fix navigation issues on iOS`
  - WORK_ITEM_ID: `FEAT-42`
  - ADDITIONAL_CONTEXT: `Fix navigation issues on iOS`

- Input: `DEBUG-13`
  - WORK_ITEM_ID: `DEBUG-13`
  - ADDITIONAL_CONTEXT: null

---

## Phase 1: Fetch & Parse Work Item

### Step 1.1: Parse Work Item ID

Parse the WORK_ITEM_ID from Phase 0 into components:

**Extract:**
- **TYPE**: Everything before `-` (e.g., "MAINT" from "MAINT-140")
- **ID_NUMBER**: Everything after `-` as integer (e.g., 140 from "MAINT-140")

**Validation:**
- TYPE must be one of: FEAT, DEBUG, INFRA, MAINT, AGENT
- ID_NUMBER must be a positive integer

**Error handling:**
- If format invalid: Report "Invalid Work Item ID format. Expected: TYPE-NUMBER (e.g., FEAT-42)"

---

### Step 1.2: Search for Work Item

Search using the content-based format (added by `/b-create`):

```
mcp__notion__notion-search
query: "Work Item ID: [WORK_ITEM_ID]"
data_source_url: "collection://${NOTION_WORK_DB}"
```

**Note**: This searches for the `## Work Item ID: MAINT-140` header that b-create adds to page content.

**If no results**, try fallback search for legacy items:
```
mcp__notion__notion-search
query: "[WORK_ITEM_ID]"
data_source_url: "collection://${NOTION_WORK_DB}"
```

---

### Step 1.3: Verify & Select Result

For each search result, verify properties match the parsed components from Step 1.1:

```
mcp__notion__notion-fetch
id: [candidate page_id from Step 1.2]
```

**Check properties:**
- `Type` property equals parsed TYPE (e.g., "MAINT")
- `userDefined:ID` property equals parsed ID_NUMBER (e.g., 140)

**If match found**: Use this page_id, proceed to Step 1.4

**If no match in results**:
- Report "Work item [WORK_ITEM_ID] not found in database"
- Suggest: "Check Notion directly or verify the Work Item ID"

**Error handling:**
- If query fails: Report error and suggest manual Notion lookup

---

### Step 1.4: Retrieve Full Page Details

```
mcp__notion__notion-fetch
id: [verified page_id from Step 1.3]
```

**Note**: Returns page properties and content in Notion-flavored Markdown format.

---

### Step 1.5: Incorporate Additional Context

**If ADDITIONAL_CONTEXT exists** (from Phase 0):

Display the additional context to inform planning:
```
📝 Additional Context: [ADDITIONAL_CONTEXT]
   This will be considered alongside work item details for planning.
```

**Actions**:
- Use ADDITIONAL_CONTEXT to guide template selection
- Consider context when analyzing classification signals
- Incorporate into planning decisions in subsequent phases

**If ADDITIONAL_CONTEXT is null**:
- Skip this step
- Proceed to Step 1.6 with Notion data only

---

### Step 1.6: Parse & Extract Classification Signals

**Parse fields**:
- Type (FEAT, DEBUG, INFRA, MAINT, AGENT)
- Name
- User Story
- Acceptance Criteria
- Technical Notes
- AGENTS REQUIRED
- Priority

**Extract signals**:
- Crisis keywords: `crisis`, `PHQ`, `GAD`, `threshold`, `988`, `suicide`, `safety plan`
- Emergency keywords: `broken`, `urgent`, `critical`, `crash`, `hotfix`
- Assessment keywords: `PHQ-9`, `GAD-7`, `assessment`, `DSM-5`, `scoring`
- Therapeutic keywords: `MBCT`, `mindfulness`, `meditation`, `breathing`, `exercise`
- Privacy keywords: `HIPAA`, `PHI`, `privacy`, `encryption`, `payment`, `PCI DSS`
- Agent requirements from AGENTS REQUIRED field

---

## Phase 2: Create Worktree

### Step 2.1: Determine Branch Naming

**Branch prefix** (based on Type from Notion):
- FEAT → `feat/`
- DEBUG → `fix/`
- INFRA → `chore/`
- MAINT → `chore/`
- AGENT → `chore/`

**Exception**: If classified as **B-HOTFIX** → use `hotfix/` prefix regardless of Type

**Branch name format**: `[prefix][work-item-id]-[slugified-name]`

Example: `feat/WI-123-add-crisis-detection`

**Directory name format**: `[work-item-id-short]` (for easy typing)

Example: `wi-123` or just the number portion

**Slugify name rules**:
- Convert to lowercase
- Replace spaces with hyphens
- Remove special characters (keep only alphanumeric and hyphens)
- Limit slugified portion to ~40 chars for readability

---

### Step 2.2: Check for Existing Worktree

**Check if worktree or branch already exists:**

```bash
cd /Users/max/dev/being
git worktree list | grep "[branch-name]"
```

**Three scenarios:**

**A) Worktree exists for this branch:**
```
/Users/max/dev/being/feat-42  abc123 [feat/FEAT-42-easy-navigation-home]
```
→ Skip to Step 2.4 (cd into existing worktree)
→ Display: `ℹ️  Using existing worktree: feat-42`

**B) Branch exists but no worktree (orphaned branch):**
```bash
git branch --list "[branch-name]"
# Returns: feat/FEAT-42-easy-navigation-home
```
→ Create worktree from existing branch (without `-b` flag)
→ Proceed to Step 2.3

**C) Neither exists:**
→ Proceed to Step 2.3 (create new)

---

### Step 2.3: Create Worktree (if needed)

**Only execute if Step 2.2 found no existing worktree.**

**If branch exists** (Scenario B):
```bash
cd /Users/max/dev/being
git worktree add [dir-name] [branch-name]
```

**If branch doesn't exist** (Scenario C):
```bash
cd /Users/max/dev/being
git worktree add [dir-name] -b [branch-name] development
```

Example (new branch):
```bash
git worktree add wi-123 -b feat/WI-123-add-crisis-detection development
```

Example (existing branch):
```bash
git worktree add wi-123 feat/WI-123-add-crisis-detection
```

**Error handling**:
- If git error: Report error details and suggest manual resolution
- If directory exists but not in worktree list: Report conflict, suggest `git worktree remove --force [dir-name]`

---

### Step 2.4: Verify/Create .claude Symlink

**Check if .claude symlink exists:**

```bash
cd /Users/max/dev/being
ls -la [dir-name]/.claude
```

**If symlink exists and points correctly:**
→ Display: `✅ .claude symlink verified`
→ Proceed to Step 2.5

**If symlink missing or broken:**
```bash
cd /Users/max/dev/being
rm -f [dir-name]/.claude  # Remove if broken
ln -s /Users/max/dev/being/.claude [dir-name]/.claude
```

Example:
```bash
ln -s /Users/max/dev/being/.claude wi-123/.claude
```

**Verify symlink:**
```bash
ls -la [dir-name]/.claude
```
Should show symlink pointing to correct location.

---

### Step 2.5: Change to Worktree Directory

**Change working directory to new worktree:**

```bash
cd /Users/max/dev/being/[dir-name]
```

Example:
```bash
cd /Users/max/dev/being/wi-123
```

**Verify location:**
```bash
pwd && git branch --show-current
```

Should show:
- Working directory: `/Users/max/dev/being/[dir-name]`
- Current branch: `[branch-name]`

---

### Step 2.6: Setup Dependencies (Conditional)

**Check if dependencies are needed:**

```bash
cd /Users/max/dev/being/[dir-name]

# Check if app/node_modules exists
if [ -d "app/node_modules" ]; then
  echo "✅ Dependencies already installed"
else
  echo "📦 Installing dependencies..."
  echo "   This may take 1-2 minutes on first setup"
  cd app
  npm install
  if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
  else
    echo "❌ Dependency installation failed"
    echo "   You may need to run 'cd app && npm install' manually"
  fi
  cd ..
fi
```

**Display messages:**

**If dependencies already exist:**
```
✅ Dependencies already installed
   Skipping npm install
```

**If installing dependencies:**
```
📦 Installing dependencies...
   Location: ~/being/[dir-name]/app
   Packages: ~400 dependencies
   ⏱️  Estimated time: 1-2 minutes

[npm install output]

✅ Dependencies installed successfully
   Ready to run: npm start, npm test, etc.
```

**If installation fails:**
```
❌ Dependency installation failed
   Please run manually: cd ~/being/[dir-name]/app && npm install
   Then run /b-work again or continue manually
```

**Error handling:**
- If npm install fails, display error but continue to next phase
- User can manually install dependencies later if needed
- Log the error for debugging

**Note**: This step ensures the worktree is immediately usable for development. It only runs when node_modules is missing, making it fast for existing worktrees.

---

### Step 2.7: Confirm Worktree Status & Context

**If worktree was created (new):**
```
🌿 Worktree created: [dir-name]
   Branch: [branch-name]
   Base: development
   Type: [TYPE] → [prefix]/

📁 Working directory: ~/being/[dir-name]
✅ All subsequent work will happen in this worktree
```

**If using existing worktree:**
```
ℹ️  Using existing worktree: [dir-name]
   Branch: [branch-name]
   Status: [clean/modified - from git status]

📁 Working directory: ~/being/[dir-name]
✅ All subsequent work will happen in this worktree
```

---

### Step 2.8: Mark Work Item as In Progress

```
mcp__notion__notion-update-page
data: {
  "page_id": "[page_id from Phase 1]",
  "command": "update_properties",
  "properties": {
    "Status": "In progress"
  }
}
```

**Display confirmation:**
```
📝 Notion updated: Status → In progress
   Work item: [WORK_ITEM_ID]
```

**Error handling**:
- If update fails: Log warning but continue (non-blocking)
- Display: "⚠️  Could not update Notion status (continuing anyway)"

---

## Phase 3: Classify Template

**Classification considers**:
- Signals from Notion fields (from Step 1.6)
- ADDITIONAL_CONTEXT (from Phase 0, if provided)

**HIGH Confidence (95%+)** - Auto-proceed:

→ **B-CRISIS** if:
- AGENTS REQUIRED contains: `crisis` AND `compliance`
- Crisis keywords + threshold patterns (≥15, ≥20)
- Name mentions: "crisis detection", "PHQ/GAD threshold", "988"
- ADDITIONAL_CONTEXT mentions crisis/safety/threshold patterns

→ **B-HOTFIX** if:
- Type: DEBUG + Priority: URGENT/CRITICAL
- Keywords: `broken`, `crash`, `emergency`
- Context: crisis/assessment/safety features
- ADDITIONAL_CONTEXT indicates urgency or emergency

→ **B-DEV (Assessment)** if:
- AGENTS REQUIRED: `crisis`
- Keywords: `PHQ-9`, `GAD-7`, `assessment`
- ADDITIONAL_CONTEXT mentions assessment features

→ **B-DEV (Therapeutic)** if:
- AGENTS REQUIRED: `philosopher`
- Keywords: `Stoic Mindfulness`, `mindfulness`, `breathing`, `virtue`
- ADDITIONAL_CONTEXT mentions therapeutic features

→ **B-DEV (Privacy)** if:
- AGENTS REQUIRED: `compliance` AND `security`
- Keywords: `HIPAA`, `PHI`, `encryption`, `payment`
- ADDITIONAL_CONTEXT mentions privacy/compliance

**MEDIUM Confidence (80-94%)** - Quick confirmation:
- Display classification and reason
- Ask: "This looks like [template/path]. Proceed? (y/n)"

**LOW Confidence (<80%)** - User chooses:
- Display: "Choose template: 1) B-DEV, 2) B-CRISIS, 3) B-DEBUG"

---

## Phase 4: Display Classification

**HIGH confidence**:
```
📋 [WORK_ITEM_ID]: [Name]
🔍 Classification: [TEMPLATE] [→ PATH] (95%+ confidence)
Reason: [Brief explanation]
Proceeding with [TEMPLATE] workflow...
```

**MEDIUM confidence**:
```
📋 [WORK_ITEM_ID]: [Name]
🔍 Classification: [TEMPLATE] (XX% confidence)
Reason: [Brief explanation]
Proceed? (y/n)
```

**LOW confidence**:
```
🤔 Unable to confidently classify
Choose template: 1) B-DEV, 2) B-CRISIS, 3) B-DEBUG
```

---

## Phase 5: Execute Template

Read the appropriate template file and execute:

**If B-CRISIS**:
```
Read ./.claude/templates/being-templates.md → "B-CRISIS: Crisis/Safety Features"
Execute exactly as documented.
```

**If B-HOTFIX**:
```
Read ./.claude/templates/being-templates.md → "B-HOTFIX: Safety Bug Hotfixes"
Execute exactly as documented.
```

**If B-DEV**:
```
Read ./.claude/templates/being-templates.md → "B-DEV: Being Development"
Execute the appropriate path (therapeutic/assessment/privacy/general).
```

**If B-DEBUG**:
```
Read ./.claude/templates/being-templates.md → "B-DEBUG: Being Debugging"
Execute exactly as documented.
```

**Note**: `./.claude/` is the symlink in the worktree pointing to `/Users/max/dev/being/.claude/`

---

## Phase 6: Commit Changes

### Step 6.1: Review Changes

```
mcp__git__git_status
repo_path: "/Users/max/dev/being/.git"
```

Display summary of changed files for user awareness.

---

### Step 6.2: Stage All Changes

```
mcp__git__git_add
repo_path: "/Users/max/dev/being/.git"
files: ["."]
```

---

### Step 6.3: Create Commit

**Commit message format**: `[type]: [work-item-id] [brief description]`

**Type mapping** (based on Type from Notion):
- FEAT → `feat:`
- DEBUG → `fix:`
- INFRA → `chore:`
- MAINT → `chore:`
- AGENT → `chore:`

**Exception**: If classified as **B-HOTFIX** → use `fix:` prefix with `[HOTFIX]` tag

**Examples**:
- `feat: WI-123 Add crisis detection with PHQ≥20 threshold`
- `fix: WI-124 Resolve breathing timer sync issue`
- `chore: WI-125 Update TypeScript configuration`
- `fix: [HOTFIX] WI-126 Emergency fix for 988 button crash`

```
mcp__git__git_commit
repo_path: "/Users/max/dev/being/.git"
message: "[type]: [work-item-id] [brief description]

[Optional detailed explanation if needed]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Error handling**:
- If no changes to commit: Report "No changes to commit" and skip to Phase 7
- If commit fails: Report error and ask user to resolve before continuing

---

### Step 6.4: Confirm Commit

Display:
```
✅ Changes committed
   Message: [commit message first line]
   Files: [count] files changed
```

---

## Phase 7: Update Notion

### Step 7.1: Update Status to Testing

```
mcp__notion__notion-update-page
data: {
  "page_id": "[page_id from Phase 1]",
  "command": "update_properties",
  "properties": {
    "Status": "Testing"
  }
}
```

### Step 7.2: Add Testing Comment

```
mcp__notion__notion-create-comment
parent: { "page_id": "[page_id from Phase 1]" }
rich_text: [
  {
    "type": "text",
    "text": {
      "content": "Ready for testing via /b-work\n\nTemplate: [TEMPLATE] [→ PATH]\nAgents: [List]\nValidations: [Summary]\n\nImplementation: [Brief summary]\nDeliverables: [List]\n\nNext: Test and run /b-close [WORK_ITEM_ID] when complete"
    }
  }
]
```

### Step 7.3: Report Testing Status

```
✅ [WORK_ITEM_ID] implementation complete
Template: [TEMPLATE] [→ PATH]
Notion updated: Status → Testing

⏭️  Next steps:
1. Test the implementation
2. Provide any feedback
3. Run: /b-close [WORK_ITEM_ID]
```

---

## Classification Bias

When uncertain, bias toward safety:
1. B-CRISIS over B-DEV (if crisis keywords present)
2. B-HOTFIX over B-DEBUG (if urgency + safety features)
3. B-DEV with domain validation over general

---

## Worktree Workflow Notes

### Existing Worktree Detection

This command **intelligently handles existing worktrees**:

**Scenario 1: Worktree already exists**
```bash
# You have: ~/being/feat-42/ already created
cd ~/being
/b-work FEAT-42

# Result:
# ℹ️  Using existing worktree: feat-42
# ✅ .claude symlink verified
# → cd feat-42
# → Continues with template execution
```

**Scenario 2: Fresh start**
```bash
# No worktree exists
cd ~/being/development
/b-work FEAT-42

# Result:
# 🌿 Worktree created: feat-42
# ✅ .claude symlink created
# → cd feat-42
# → Continues with template execution
```

**Key benefit**: You can run `/b-work FEAT-42` multiple times safely. If the worktree exists, it uses it. If not, it creates it.

### After This Command Completes

This command:
1. Detects or creates worktree directory
2. Verifies/creates `.claude` symlink
3. **Automatically changes into worktree** (`cd ~/being/[work-item-dir]`)
4. Executes all template work in that worktree
5. Commits changes to the branch

**Result**: All work happens in the dedicated worktree for this work item.

### Working Directory Context

After `/b-work` completes, your working directory will be:
```
~/being/[work-item-dir]
```

You can continue working in this worktree, or return to a different worktree:
```bash
cd ~/being/development  # Return to development
cd ~/being/feat-23      # Switch to different feature
```

### Parallel Work

The worktree structure allows:
- Running multiple `/b-work` commands in different terminals (creates separate worktrees)
- Each terminal can work on different features simultaneously
- No branch switching conflicts

### Important: Git Operations

All git MCP calls use:
```
repo_path: "/Users/max/dev/being/.git"
```

This points to the bare repository, which manages all worktrees.

Git operations will affect whichever worktree corresponds to the current branch context.

---

*File location: ~/Development/active/being/.claude/commands/b-work.md*
