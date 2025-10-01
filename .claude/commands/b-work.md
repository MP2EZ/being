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

## Phase 2: Classify Template

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

## Phase 3: Display Classification

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

## Phase 4: Execute Template

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

## Phase 5: Update Notion

### Step 5.1: Update Status

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

### Step 5.2: Add Completion Comment

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

### Step 5.3: Report Completion

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
