# Create Work Item in Notion

**ARGUMENTS**: `[TYPE] - [Name]`

**Types**: FEAT | DEBUG | INFRA | MAINT | AGENT

**Example**: `/b-create FEAT - Simple subscription flow`

**Database ID**: 277a1108c20880bda80dce2ec7d8a12e

---

## Phase 1: Parse Arguments

Parse `$ARGUMENTS` using pattern: `[TYPE] - [Name]`

**Extract**:
- TYPE: First word before ` - `
- Name: Everything after ` - `

**Validate TYPE**:
- Must be one of: FEAT, DEBUG, INFRA, MAINT, AGENT
- If invalid, error: "Invalid TYPE. Use: FEAT, DEBUG, INFRA, MAINT, or AGENT"

**Example**:
```
Input: "FEAT - Simple subscription flow"
→ TYPE: "FEAT"
→ Name: "Simple subscription flow"
```

---

## Phase 2: Extract from Conversation Context

**Analyze recent conversation** (last 10-20 messages) to extract:

### User Story
Look for:
- Problem statements: "I need to...", "Users want to...", "The issue is..."
- Feature requests: "Add ability to...", "Create a way to..."
- Pain points: "Currently X is difficult...", "Users can't..."

**Extract**: 2-4 sentences describing what and why

### Acceptance Criteria
Look for:
- Success conditions: "It should...", "When X happens...", "Users can..."
- Requirements: "Must include...", "Needs to...", "Should validate..."
- Test scenarios: "If...", "When...", "Given..."

**Extract**: Bulleted list of 3-5 criteria

### Technical Notes
Look for:
- Implementation details: "Use X library", "Store in Y", "Call Z API"
- Constraints: "Must be <200ms", "Needs encryption", "Mobile-first"
- Technical decisions: "Use zustand", "React Native", "Server-side"
- Dependencies: "Requires X first", "Blocks Y", "Depends on Z"

**Extract**: Bulleted list of relevant technical context

### AGENTS REQUIRED
Analyze the **Name** and **extracted context** for keywords and suggest agents:

**Crisis/Safety keywords**: `crisis`, `PHQ`, `GAD`, `threshold`, `988`, `suicide`, `safety plan`, `emergency`
→ Suggest: `crisis, compliance`

**Assessment keywords**: `assessment`, `PHQ-9`, `GAD-7`, `DSM-5`, `scoring`, `questionnaire`
→ Suggest: `clinician, crisis`

**Therapeutic keywords**: `therapeutic`, `MBCT`, `mindfulness`, `meditation`, `breathing`, `exercise`, `body scan`
→ Suggest: `clinician`

**Privacy/PHI keywords**: `privacy`, `HIPAA`, `PHI`, `encryption`, `payment`, `PCI`, `consent`, `data export`
→ Suggest: `compliance, security`

**Performance keywords**: `performance`, `optimize`, `slow`, `lag`, `bundle size`
→ Suggest: `performance`

**Default**: No strong matches
→ Suggest: (leave empty - user can add later)

---

## Phase 3: Display Extracted Content & Confirm

**Display extracted content to user**:

```
📋 Work Item: [TYPE from Phase 1] - [Name from Phase 1]

**User Story**:
[Extracted user story, or "(No clear user story found in conversation)"]

**Acceptance Criteria**:
[Extracted criteria as bulleted list, or "(No criteria found in conversation)"]

**Technical Notes**:
[Extracted technical context, or "(No technical notes found in conversation)"]

**AGENTS REQUIRED**: [Suggested agents, or "none"]

---
Does this look correct? (y/n/edit)
- y: Create work item as shown
- n: Cancel creation
- edit: Provide corrections (Claude will prompt for each field)
```

**If user selects "edit"**:
Prompt for each field individually:
```
User Story (or press Enter to skip):
Acceptance Criteria (or press Enter to skip):
Technical Notes (or press Enter to skip):
AGENTS REQUIRED (or press Enter to use suggested):
```

**If user selects "n"**:
```
❌ Work item creation cancelled.
```

**If user selects "y"**: Proceed to Phase 4

---

## Phase 4: Create Page in Notion

```
mcp__notionApi__API-post-page
parent: {
  "type": "database_id",
  "database_id": "277a1108c20880bda80dce2ec7d8a12e"
}
properties: {
  "Name": {
    "title": [
      {
        "text": {
          "content": [Name from Phase 1]
        }
      }
    ]
  },
  "Type": {
    "select": {
      "name": [TYPE from Phase 1]
    }
  },
  "Status": {
    "status": {
      "name": "Not started"
    }
  }
}
children: [
  {
    "object": "block",
    "type": "heading_2",
    "heading_2": {
      "rich_text": [{ "text": { "content": "User Story" } }]
    }
  },
  {
    "object": "block",
    "type": "paragraph",
    "paragraph": {
      "rich_text": [{ "text": { "content": [User Story from Phase 3 confirmation, or "(Add user story here)"] } }]
    }
  },
  {
    "object": "block",
    "type": "heading_2",
    "heading_2": {
      "rich_text": [{ "text": { "content": "Acceptance Criteria" } }]
    }
  },
  {
    "object": "block",
    "type": "paragraph",
    "paragraph": {
      "rich_text": [{ "text": { "content": [Acceptance Criteria from Phase 3 confirmation, or "(Add acceptance criteria here)"] } }]
    }
  },
  {
    "object": "block",
    "type": "heading_2",
    "heading_2": {
      "rich_text": [{ "text": { "content": "Technical Notes" } }]
    }
  },
  {
    "object": "block",
    "type": "paragraph",
    "paragraph": {
      "rich_text": [{ "text": { "content": [Technical Notes from Phase 3 confirmation, or "(Add technical notes here)"] } }]
    }
  },
  {
    "object": "block",
    "type": "heading_2",
    "heading_2": {
      "rich_text": [{ "text": { "content": "AGENTS REQUIRED" } }]
    }
  },
  {
    "object": "block",
    "type": "paragraph",
    "paragraph": {
      "rich_text": [{ "text": { "content": [AGENTS REQUIRED from Phase 3 confirmation, or "(Determine based on work type)"] } }]
    }
  }
]
```

**Note**: Work Item ID and Work Item Name will be auto-generated by Notion based on TYPE and Name, returned in response.

---

## Phase 5: Extract & Display Result

From the Notion API response, extract:
- **Work Item Name**: `properties["Work Item Name"]` (auto-generated by Notion)

**Display to user**:
```
✅ Created [Work Item Name]
Suggested agents: [AGENTS REQUIRED or "none"]

Ready to work on it? Use: /b-work [WORK_ITEM_ID]
```

**Example output**:
```
✅ Created FEAT-27: Simple subscription flow
Suggested agents: compliance, security

Ready to work on it? Use: /b-work FEAT-27
```

---

## Error Handling

**Invalid TYPE**:
```
❌ Invalid TYPE: "FEATURE"
Valid types: FEAT, DEBUG, INFRA, MAINT, AGENT
```

**Missing Name**:
```
❌ Invalid format. Use: /b-create [TYPE] - [Name]
Example: /b-create FEAT - Simple subscription flow
```

**Notion API failure**:
```
❌ Failed to create work item in Notion
Error: [error message]
Please try again or create manually in Notion.
```

---

## Notes

**Context Extraction**:
- Command analyzes last 10-20 messages in conversation
- Extracts User Story, Acceptance Criteria, Technical Notes, and suggests AGENTS REQUIRED
- User confirms/edits before creation (no surprises)

**Fallback Behavior**:
- If no context found, placeholders are used (e.g., "(Add user story here)")
- User can still choose to provide details during creation (edit option)
- Or add details later in Notion UI

**Work Item Structure**:
- Work Item ID follows pattern: `[TYPE]-[NN]` (e.g., FEAT-27, DEBUG-15)
- Work Item Name is auto-generated by Notion
- Priority can be set in Notion after creation
- Status defaults to "Not started"

**Best Practice**:
- Discuss feature/bug in conversation first
- Then use `/b-create [TYPE] - [Name]` to capture work item
- Claude extracts context automatically
- Confirm and create → seamless handoff to `/b-work`

---

*File location: ~/Development/active/fullmind/.claude/commands/b-create.md*
