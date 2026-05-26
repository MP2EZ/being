# Being Work Item Executor [META-COMMAND]

**ARGUMENTS**: $ARGUMENTS

**Format**: `[Work Item ID] - [Additional context]`

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

Parse WORK_ITEM_ID into components:
- **TYPE**: Everything before `-` (e.g., "MAINT" from "MAINT-140")
- **ID_NUMBER**: Everything after `-` as integer

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

This matches the `## Work Item ID: MAINT-140` header that `/b-create` adds to page content.

**If no results**, fallback search for legacy items:
```
mcp__notion__notion-search
query: "[WORK_ITEM_ID]"
data_source_url: "collection://${NOTION_WORK_DB}"
```

---

### Step 1.3: Verify & Select Result

For each search result, verify properties match the parsed components:

```
mcp__notion__notion-fetch
id: [candidate page_id from Step 1.2]
```

**Check properties:**
- `Type` equals parsed TYPE
- `userDefined:ID` equals parsed ID_NUMBER

**If match found**: Use this page_id, proceed to Step 1.4

**If no match**:
- Report "Work item [WORK_ITEM_ID] not found in database"
- Suggest: "Check Notion directly or verify the Work Item ID"

---

### Step 1.4: Retrieve Full Page Details

```
mcp__notion__notion-fetch
id: [verified page_id from Step 1.3]
```

Returns page properties and content in Notion-flavored Markdown.

---

### Step 1.5: Incorporate Additional Context

**If ADDITIONAL_CONTEXT exists** (from Phase 0):

Display:
```
📝 Additional Context: [ADDITIONAL_CONTEXT]
   This will be considered alongside work item details for planning.
```

Use ADDITIONAL_CONTEXT to inform safety-scan and implementation in subsequent phases.

---

### Step 1.6: Extract Context

Parse from Notion page:
- Type (FEAT, DEBUG, INFRA, MAINT, AGENT)
- Name
- User Story
- Acceptance Criteria
- Technical Notes
- AGENTS REQUIRED (suggested by `/b-create`; may be empty)
- Priority

These feed the safety scan in Phase 3.

---

## Phase 2: Create Worktree

### Step 2.1: Determine Branch Naming

**Branch prefix** (based on Type from Notion):
- FEAT → `feat/`
- DEBUG → `fix/`
- INFRA → `chore/`
- MAINT → `chore/`
- AGENT → `chore/`

**Exception**: For emergency safety/crisis fixes (Priority=URGENT or explicit `--hotfix` intent in ADDITIONAL_CONTEXT), use `hotfix/` prefix.

**Branch name format**: `[prefix][work-item-id]-[slugified-name]`

Example: `feat/WI-123-add-crisis-detection`

**Directory name format**: `[work-item-id-short]` (for easy typing)

Example: `wi-123`

**Slugify name rules**:
- Convert to lowercase
- Replace spaces with hyphens
- Remove special characters (keep only alphanumeric and hyphens)
- Limit slugified portion to ~40 chars

---

### Step 2.2: Check for Existing Worktree

```bash
cd /Users/max/dev/being
git worktree list | grep "[branch-name]"
```

**Three scenarios:**

**A) Worktree exists for this branch:**
→ Skip to Step 2.4 (cd into existing worktree)
→ Display: `ℹ️  Using existing worktree: feat-42`

**B) Branch exists but no worktree (orphaned branch):**
```bash
git branch --list "[branch-name]"
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

**Error handling**:
- If git error: Report error details and suggest manual resolution
- If directory exists but not in worktree list: Report conflict, suggest `git worktree remove --force [dir-name]`

---

### Step 2.4: Change to Worktree Directory

```bash
cd /Users/max/dev/being/[dir-name]
```

**Verify location:**
```bash
pwd && git branch --show-current
```

Should show:
- Working directory: `/Users/max/dev/being/[dir-name]`
- Current branch: `[branch-name]`

---

### Step 2.5: Setup Env Symlinks (Idempotent)

Worktrees do not store their own env files. Both `.env.production` and `.env.development` symlink to canonical files at `~/dev/being/.config/`. See CLAUDE.md "Known Gotchas" for details.

```bash
cd /Users/max/dev/being/[dir-name]

if [ ! -L "app/.env.production" ]; then
  ln -s ../../.config/env.production app/.env.production
  echo "✅ Symlinked app/.env.production -> ~/dev/being/.config/env.production"
fi
if [ ! -L "app/.env.development" ]; then
  ln -s ../../.config/env.development app/.env.development
  echo "✅ Symlinked app/.env.development -> ~/dev/being/.config/env.development"
fi
```

If the canonical files at `~/dev/being/.config/` don't exist, the symlinks will be broken (dangling). The app will start but env vars will be undefined — schema validation (when added) will catch this loudly.

### Step 2.6: Setup Dependencies (Conditional)

```bash
cd /Users/max/dev/being/[dir-name]

if [ -d "app/node_modules" ]; then
  echo "✅ Dependencies already installed"
else
  echo "📦 Installing dependencies..."
  cd app && npm install
fi
```

**If dependencies already exist:**
```
✅ Dependencies already installed
   Skipping npm install
```

**If installing:**
```
📦 Installing dependencies...
   Location: ~/being/[dir-name]/app
   ⏱️  Estimated time: 1-2 minutes
```

**If installation fails:**
```
❌ Dependency installation failed
   Please run manually: cd ~/being/[dir-name]/app && npm install
```

---

### Step 2.6: Confirm Worktree Status

**If worktree was created (new):**
```
🌿 Worktree created: [dir-name]
   Branch: [branch-name]
   Base: development
   Type: [TYPE] → [prefix]/

📁 Working directory: ~/being/[dir-name]
```

**If using existing worktree:**
```
ℹ️  Using existing worktree: [dir-name]
   Branch: [branch-name]
   Status: [clean/modified]

📁 Working directory: ~/being/[dir-name]
```

---

### Step 2.7: Mark Work Item as In Progress

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

**Display:**
```
📝 Notion updated: Status → In progress
   Work item: [WORK_ITEM_ID]
```

---

## Phase 3: Safety Scan & Implement

### Step 3.1: Safety Scan

Scan the work item's **Name**, **User Story**, **Acceptance Criteria**, **AGENTS REQUIRED**, and **ADDITIONAL_CONTEXT** for the signals below. If matches are found, invoke the corresponding specialist agent for a planning pass *before* writing code. The agent's job is to set non-negotiable constraints; the main agent implements within them.

| Signal | Agent | Examples |
|---|---|---|
| `crisis`, `988`, `PHQ`, `GAD`, `threshold`, `suicide`, `safety plan`, `emergency` | `crisis` | Crisis detection, threshold logic, 988 integration |
| `Stoic`, `Marcus Aurelius`, `Epictetus`, `Seneca`, `virtue`, `dichotomy of control`, `mindfulness`, `breathing`, `prosoche` | `philosopher` | Stoic Mindfulness content, exercises, principles |
| `consent`, `privacy`, `data export`, `encryption`, `wellness data`, `payment`, `CCPA`, `TDPSA`, `GDPR` | `compliance` | Privacy/data flows, consent UI, regulatory questions |

Multiple signals → invoke multiple specialists in parallel.

Reference `CLAUDE.md` for safety facts (PHQ/GAD thresholds, 988 access budget, performance budgets, validation matrix). Specialist agent specs are at:
- `/Users/max/dev/being/.claude/agents/crisis.md`
- `/Users/max/dev/being/.claude/agents/compliance.md`
- `/Users/max/dev/being/.claude/agents/philosopher.md`

**Maestro flow-authoring advisory** (INFRA-171): if the signals matched include any of `crisis`, `988`, `PHQ`, `GAD`, `threshold`, `assessment`, `safety plan`, or `emergency`, the implementation deliverable extends to include a Maestro safety flow:

> 🛡️  Safety-surface signals matched. Before commit:
> - [ ] Specialist agent planning pass complete (per table above)
> - [ ] New or updated Maestro flow exists in `app/.maestro/` that pins the user-visible contract this work changes (or this work's changes are already covered by an existing flow — confirm which)
> - [ ] Scoped flow passes locally: `npm run e2e:safety:<flow>` (full suite: `npm run e2e:safety`)
> The `/b-close` Phase 2.5 gate will block push when safety-surface paths change and Maestro fails. This is advisory; the hard gate is in `/b-close`.

**If no signals match**: proceed directly to Step 3.2. General UI work and backend changes don't require a planning pass.

---

### Step 3.2: Implement

Implement per the Acceptance Criteria. Constraints from any specialist planning pass are non-negotiable. Enforce performance budgets and safety facts from `CLAUDE.md`.

- **UI changes**: design tokens from `@/core/theme` only; no hardcoded colors/spacing/fontSize.
- **Wellness data**: AES-256 encryption at rest via `expo-secure-store` or `react-native-aes-crypto`. Use "wellness data" terminology, not "PHI."
- **Crisis-adjacent code**: `crisis` agent validates timing budget (<200ms) and threshold logic before commit.
- **Stoic content**: `philosopher` agent validates classical accuracy and framework coherence before commit.

---

## Phase 4: Commit Changes

### Step 4.1: Review Changes

```
mcp__git__git_status
repo_path: "/Users/max/dev/being/.git"
```

Display summary of changed files for user awareness.

---

### Step 4.2: Stage All Changes

```
mcp__git__git_add
repo_path: "/Users/max/dev/being/.git"
files: ["."]
```

---

### Step 4.3: Create Commit

**Commit message format**: `[type]: [work-item-id] [brief description]`

**Type mapping** (based on Type from Notion):
- FEAT → `feat:`
- DEBUG → `fix:`
- INFRA → `chore:`
- MAINT → `chore:`
- AGENT → `chore:`

**Exception**: For emergency safety/crisis hotfixes, use `fix:` with `[HOTFIX]` tag.

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
- If no changes to commit: Report "No changes to commit" and skip to Phase 5
- If commit fails: Report error and ask user to resolve before continuing

---

### Step 4.4: Confirm Commit

```
✅ Changes committed
   Message: [commit message first line]
   Files: [count] files changed
```

---

## Phase 5: Update Notion

### Step 5.1: Update Status to Testing

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

### Step 5.2: Add Testing Comment

```
mcp__notion__notion-create-comment
parent: { "page_id": "[page_id from Phase 1]" }
rich_text: [
  {
    "type": "text",
    "text": {
      "content": "Ready for testing via /b-work\n\nAgents invoked: [List or 'none']\n\nImplementation: [Brief summary]\nDeliverables: [List]\n\nNext: Test and run /b-close [WORK_ITEM_ID] when complete"
    }
  }
]
```

### Step 5.3: Report Testing Status

```
✅ [WORK_ITEM_ID] implementation complete
Notion updated: Status → Testing

⏭️  Next steps:
1. Test the implementation
2. Provide any feedback
3. Run: /b-close [WORK_ITEM_ID]
```

---

## Worktree Workflow Notes

### Existing Worktree Detection

`/b-work` intelligently handles existing worktrees:

**Scenario 1: Worktree already exists**
```bash
# You have: ~/being/feat-42/ already created
cd ~/being
/b-work FEAT-42

# Result:
# ℹ️  Using existing worktree: feat-42
# → cd feat-42
# → Continues with safety scan & implementation
```

**Scenario 2: Fresh start**
```bash
# No worktree exists
cd ~/being
/b-work FEAT-42

# Result:
# 🌿 Worktree created: feat-42
# → cd feat-42
# → Continues with safety scan & implementation
```

You can run `/b-work FEAT-42` multiple times safely.

### Parallel Work

The worktree structure allows:
- Running multiple `/b-work` commands in different terminals (creates separate worktrees)
- Each terminal can work on different features simultaneously
- No branch switching conflicts

### Git Operations

All git MCP calls use:
```
repo_path: "/Users/max/dev/being/.git"
```

This points to the bare repository, which manages all worktrees.

---

*File location: /Users/max/dev/being/.claude/commands/b-work.md*
