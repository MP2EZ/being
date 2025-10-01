# Being Work Item Executor [META-COMMAND]

**WORK_ITEM_ID**: $ARGUMENTS

**Database ID**: 277a1108c20880bda80dce2ec7d8a12e

---

## Phase 1: Fetch & Parse Work Item

### Step 1.1: Query Database for Work Item

Query the Notion database to find the page with matching Work Item ID:

```
mcp__notionApi__API-post-database-query
database_id: "277a1108c20880bda80dce2ec7d8a12e"
filter: {
  "property": "Work Item ID",
  "title": {
    "equals": "$ARGUMENTS"
  }
}
```

**Error handling**:
- If no results: Report "Work item $ARGUMENTS not found"
- If multiple results: Report "Multiple items found - contact admin"
- If query fails: Report error and suggest retry or use direct command

**Extract page_id** from the first result.

---

### Step 1.2: Retrieve Full Page Details

```
mcp__notionApi__API-retrieve-a-page
page_id: [page_id from Step 1.1]
```

---

### Step 1.3: Parse & Extract Classification Signals

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

## Phase 2: Create Git Branch

### Step 2.1: Check Current Branch

```
mcp__git__git_status
repo_path: "/Users/max/Development/active/fullmind"
```

Report current branch for user awareness.

---

### Step 2.2: Determine Branch Naming

**Branch prefix** (based on Type from Notion):
- FEAT → `feat/`
- DEBUG → `fix/`
- INFRA → `chore/`
- MAINT → `chore/`
- AGENT → `chore/`

**Exception**: If classified as **B-HOTFIX** → use `hotfix/` prefix regardless of Type

**Branch name format**: `[prefix][work-item-id]-[slugified-name]`

Example: `feat/WI-123-add-crisis-detection`

**Slugify name rules**:
- Convert to lowercase
- Replace spaces with hyphens
- Remove special characters (keep only alphanumeric and hyphens)
- Limit slugified portion to ~40 chars for readability

---

### Step 2.3: Create and Checkout Branch

```
mcp__git__git_create_branch
repo_path: "/Users/max/Development/active/fullmind"
branch_name: "[prefix][work-item-id]-[slugified-name]"
base_branch: "development"
```

**Then immediately checkout**:
```
mcp__git__git_checkout
repo_path: "/Users/max/Development/active/fullmind"
branch_name: "[prefix][work-item-id]-[slugified-name]"
```

**Error handling**:
- If branch already exists: Report and ask user to either:
  1. Continue on existing branch
  2. Delete and recreate (if safe)
  3. Create with alternate name (append `-v2`, `-v3`, etc.)
- If git error: Report error details and suggest manual resolution

---

### Step 2.4: Confirm Branch Creation

Display:
```
🌿 Branch created: [branch-name]
   Base: development
   Type: [TYPE] → [prefix]/
```

---

## Phase 3: Classify Template

**HIGH Confidence (95%+)** - Auto-proceed:

→ **B-CRISIS** if:
- AGENTS REQUIRED contains: `crisis` AND `compliance`
- Crisis keywords + threshold patterns (≥15, ≥20)
- Name mentions: "crisis detection", "PHQ/GAD threshold", "988"

→ **B-HOTFIX** if:
- Type: DEBUG + Priority: URGENT/CRITICAL
- Keywords: `broken`, `crash`, `emergency`
- Context: crisis/assessment/safety features

→ **B-DEV (Assessment)** if:
- AGENTS REQUIRED: `clinician`
- Keywords: `PHQ-9`, `GAD-7`, `assessment`

→ **B-DEV (Therapeutic)** if:
- AGENTS REQUIRED: `clinician`
- Keywords: `MBCT`, `mindfulness`, `breathing`

→ **B-DEV (Privacy)** if:
- AGENTS REQUIRED: `compliance` AND `security`
- Keywords: `HIPAA`, `PHI`, `encryption`, `payment`

**MEDIUM Confidence (80-94%)** - Quick confirmation:
- Display classification and reason
- Ask: "This looks like [template/path]. Proceed? (y/n)"

**LOW Confidence (<80%)** - User chooses:
- Display: "Choose template: 1) B-DEV, 2) B-CRISIS, 3) B-DEBUG"

---

## Phase 4: Display Classification

**HIGH confidence**:
```
📋 $ARGUMENTS: [Name]
🔍 Classification: [TEMPLATE] [→ PATH] (95%+ confidence)
Reason: [Brief explanation]
Proceeding with [TEMPLATE] workflow...
```

**MEDIUM confidence**:
```
📋 $ARGUMENTS: [Name]
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
Read ~/.claude/templates/being-templates.md → "B-CRISIS: Crisis/Safety Features"
Execute exactly as documented.
```

**If B-HOTFIX**:
```
Read ~/.claude/templates/being-templates.md → "B-HOTFIX: Safety Bug Hotfixes"
Execute exactly as documented.
```

**If B-DEV**:
```
Read ~/.claude/templates/being-templates.md → "B-DEV: Being Development"
Execute the appropriate path (therapeutic/assessment/privacy/general).
```

**If B-DEBUG**:
```
Read ~/.claude/templates/being-templates.md → "B-DEBUG: Being Debugging"
Execute exactly as documented.
```

---

## Phase 6: Commit Changes

### Step 6.1: Review Changes

```
mcp__git__git_status
repo_path: "/Users/max/Development/active/fullmind"
```

Display summary of changed files for user awareness.

---

### Step 6.2: Stage All Changes

```
mcp__git__git_add
repo_path: "/Users/max/Development/active/fullmind"
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
repo_path: "/Users/max/Development/active/fullmind"
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

### Step 7.1: Update Status

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

### Step 7.2: Add Completion Comment

```
mcp__notionApi__API-create-a-comment
parent: { page_id: [page_id from Phase 1] }
rich_text: [
  {
    text: {
      content: "✅ Completed via /being-work\n\nTemplate: [TEMPLATE] [→ PATH]\nAgents: [List]\nValidations: [Summary]\n\nImplementation: [Brief summary]\nDeliverables: [List]"
    }
  }
]
```

### Step 7.3: Report Completion

```
✅ $ARGUMENTS complete
Template: [TEMPLATE] [→ PATH]
Notion updated: Status → Done
```

---

## Classification Bias

When uncertain, bias toward safety:
1. B-CRISIS over B-DEV (if crisis keywords present)
2. B-HOTFIX over B-DEBUG (if urgency + safety features)
3. B-DEV with domain validation over general

---

*File location: ~/Development/active/fullmind/.claude/commands/b-work.md*
