# Create Work Item in Notion

**ARGUMENTS**: `[TYPE] - [Name] [--review]`

**Types**: FEAT | DEBUG | INFRA | MAINT | AGENT

**Examples**:
- `/b-create FEAT - Simple subscription flow`
- `/b-create FEAT - Medication tracking --review`

**Database ID**: 277a1108c20880bda80dce2ec7d8a12e

---

## Phase 1: Parse Arguments

Parse `$ARGUMENTS` using pattern: `[TYPE] - [Name] [--review]`

**Extract**:
- TYPE: First word before ` - `
- Name: Everything after ` - ` (excluding `--review` flag if present)
- REVIEW_FLAG: `true` if `--review` present at end, `false` otherwise

**Parsing logic**:
1. Check if arguments end with `--review` (strip and set flag)
2. Split remaining by ` - ` delimiter
3. Extract TYPE (before ` - `) and Name (after ` - `)

**Validate TYPE**:
- Must be one of: FEAT, DEBUG, INFRA, MAINT, AGENT
- If invalid, error: "Invalid TYPE. Use: FEAT, DEBUG, INFRA, MAINT, or AGENT"

**Examples**:
```
Input: "FEAT - Simple subscription flow"
→ TYPE: "FEAT"
→ Name: "Simple subscription flow"
→ REVIEW_FLAG: false

Input: "FEAT - Medication tracking --review"
→ TYPE: "FEAT"
→ Name: "Medication tracking"
→ REVIEW_FLAG: true
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

## Phase 3: Main Agent Dimension Scoring

**Always performed** (regardless of REVIEW_FLAG)

Based on conversation context and extracted information, score each dimension using Being's prioritization framework (`/docs/product/prioritization-framework.md`):

**Impact (1-5)**: Business outcome magnitude
- Score: [1-5]
- Rationale: [1 sentence - effect on retention, conversion, market position, revenue potential]

**Value (1-5)**: User benefit (weighted 1.5× in Priority formula)
- Score: [1-5]
- Rationale: [1 sentence - safety, therapeutic effectiveness, functional value, experience quality]

**Strategic Fit (1-5)**: MBCT/mission alignment
- Score: [1-5]
- Rationale: [1 sentence - how well this aligns with Being's MBCT-based mental health mission]

**Urgency (1-5)**: Deadline urgency
- Score: [1-5]
- Rationale: [1 sentence - external deadlines, dependencies, blockers, market windows]

**Effort (XS/S/M/L/XL/XXL)**: Development complexity
- Size: [XS/S/M/L/XL/XXL]
- Rationale: [1 sentence - engineering, design, testing, clinical validation, documentation scope]

**Risk (1-5)**: Technical/domain/operational risk
- Score: [1-5]
- Rationale: [1 sentence - uncertainty, dependencies, safety implications, compliance complexity]

**Quick Reference**:
- Impact: 5=Transformative, 4=Significant, 3=Moderate, 2=Minor, 1=Negligible
- Value: 5=Critical Need, 4=Significant Need, 3=Noticeable Benefit, 2=Quality of Life, 1=Cosmetic
- Strategic Fit: 5=Mission Essential, 4=Core Strategy, 3=Aligned, 2=Peripheral, 1=Tangential
- Urgency: 5=Critical Blocker, 4=Hard Deadline, 3=Target Window, 2=Opportunistic, 1=No Deadline
- Effort: XS=1pt (~1wk), S=2pt (1-2wk), M=3pt (2-3wk), L=5pt (3-5wk), XL=8pt (5-8wk), XXL=13pt (8+wk)
- Risk: 5=Critical Risk, 4=High Risk, 3=Moderate Complexity, 2=Some Unknowns, 1=Low Risk

---

## Phase 4: Product Validation (Optional)

**Only if REVIEW_FLAG = true**

Invoke product agent to perform comprehensive review of work item:

**Prompt to product agent**:
```
Review this work item for product quality and calibration:

WORK ITEM: [TYPE] - [Name]
CONVERSATION CONTEXT: [Summary of last 10-20 messages]

EXTRACTED BY MAIN AGENT:

**User Story**:
[extracted user story from Phase 2]

**Acceptance Criteria**:
[extracted criteria from Phase 2]

**Technical Notes**:
[extracted notes from Phase 2]

**AGENTS REQUIRED**:
[suggested agents from Phase 2]

**Dimension Scores**:
- Impact: [score] - [rationale]
- Value: [score] - [rationale]
- Strategic Fit: [score] - [rationale]
- Urgency: [score] - [rationale]
- Effort: [size] - [rationale]
- Risk: [score] - [rationale]

---

REVIEW TASKS:

1. **User Story**:
   - Check "As a [user], I want [goal], so that [benefit]" format
   - Ensure clarity and user-centric framing
   - Validate benefit aligns with Being's therapeutic mission
   - Suggest refinements if needed

2. **Acceptance Criteria**:
   - Ensure measurable and testable
   - Check completeness (happy path + edge cases)
   - Identify missing criteria based on user story
   - Validate therapeutic/safety considerations if applicable
   - Suggest additions or refinements

3. **Dimension Scores**:
   - Validate against /docs/product/prioritization-framework.md
   - Check calibration with Being's context (safety-first, MBCT, pre-launch)
   - Compare to framework examples
   - Suggest adjustments with specific reasoning

---

RETURN FORMAT:

**User Story Review**:
[APPROVE / REFINE: suggested improvement with reasoning]

**Acceptance Criteria Review**:
[APPROVE / ENHANCE: suggested additions/changes with reasoning]

**Dimension Score Reviews**:
- Impact: [AGREE / ADJUST to X because...]
- Value: [AGREE / ADJUST to X because...]
- Strategic Fit: [AGREE / ADJUST to X because...]
- Urgency: [AGREE / ADJUST to X because...]
- Effort: [AGREE / ADJUST to X because...]
- Risk: [AGREE / ADJUST to X because...]

**Cross-Cutting Notes**:
[Any observations about technical notes or required agents based on refined requirements]
```

**Product agent returns comprehensive feedback for all components.**

---

## Phase 5: Main Agent Incorporates Feedback (Optional)

**Only if REVIEW_FLAG = true**

Main agent processes product validation feedback and updates all components:

1. **Refine User Story** based on product feedback
2. **Enhance Acceptance Criteria** based on product feedback
3. **Reconsider Technical Notes** based on refined user story and acceptance criteria
4. **Reconsider Agents Required** based on refined user story and acceptance criteria
5. **Adjust Dimension Scores** based on product validation

**Output format**:
```
REFINED WORK ITEM (after product validation):

**User Story**:
[Final user story]
[If changed: "✓ Refined from: [original snippet]"]

**Acceptance Criteria**:
[Final criteria with all items]
[If enhanced: "✓ Added: [list new criteria]"]

**Technical Notes**:
[Final technical notes]
[If reconsidered: "✓ Updated based on refined requirements"]

**AGENTS REQUIRED**:
[Final agent list]
[If adjusted: "✓ Adjusted: [note changes and why]"]

**Dimension Scores**:
- Impact: [final score] - [rationale, note if adjusted]
- Value: [final score] - [rationale, note if adjusted]
- Strategic Fit: [final score] - [rationale, note if adjusted]
- Urgency: [final score] - [rationale, note if adjusted]
- Effort: [final size] - [rationale, note if adjusted]
- Risk: [final score] - [rationale, note if adjusted]
```

---

## Phase 6: Display Extracted Content & Confirm

**If REVIEW_FLAG = false** (standard workflow):

```
📋 Work Item: [TYPE] - [Name]

**User Story**:
[Extracted user story, or "(No clear user story found in conversation)"]

**Acceptance Criteria**:
[Extracted criteria as bulleted list, or "(No criteria found in conversation)"]

**Technical Notes**:
[Extracted technical context, or "(No technical notes found in conversation)"]

**AGENTS REQUIRED**: [Suggested agents, or "none"]

**Dimension Scores**:
- Impact: [score] - [rationale]
- Value: [score] - [rationale]
- Strategic Fit: [score] - [rationale]
- Urgency: [score] - [rationale]
- Effort: [size] - [rationale]
- Risk: [score] - [rationale]

---
Does this look correct? (y/n/edit)
- y: Create work item as shown
- n: Cancel creation
- edit: Provide corrections (Claude will prompt for each field)
```

**If REVIEW_FLAG = true** (with product validation):

```
📋 Work Item: [TYPE] - [Name] (product-validated)

**User Story**:
[Final user story after product validation]
[If refined: "✓ Refined from: [original snippet]"]

**Acceptance Criteria**:
[Final criteria with all items after product validation]
[If enhanced: "✓ Added: [list new criteria]"]

**Technical Notes**:
[Final technical notes]
[If reconsidered: "✓ Updated based on refined requirements"]

**AGENTS REQUIRED**: [Final agent list]
[If adjusted: "✓ Adjusted: [note changes and why]"]

**Dimension Scores**:
- Impact: [final score] - [rationale]
- Value: [final score] - [rationale]
- Strategic Fit: [final score] - [rationale]
- Urgency: [final score] - [rationale]
- Effort: [final size] - [rationale]
- Risk: [final score] - [rationale]

---
Product Validation Summary:
[Concise bullet list of what was refined/enhanced/validated]

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
Dimension Scores - adjust any? (specify dimension and new value, or Enter to skip):
```

**If user selects "n"**:
```
❌ Work item creation cancelled.
```

**If user selects "y"**: Proceed to Phase 7

---

## Phase 7: Create Page in Notion

NOTE: The Notion API update-block endpoint does not support updating block content. To update acceptance criteria or other block content after creation, blocks must be deleted and recreated using patch-block-children.

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
  },
  "Impact": {
    "number": [Impact score from Phase 6]
  },
  "Value": {
    "number": [Value score from Phase 6]
  },
  "Strat Fit": {
    "number": [Strategic Fit score from Phase 6]
  },
  "Urgency": {
    "number": [Urgency score from Phase 6]
  },
  "Risk": {
    "number": [Risk score from Phase 6]
  },
  "Effort": {
    "select": {
      "name": [Effort size from Phase 6]
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
      "rich_text": [{ "text": { "content": [AGENTS REQUIRED from Phase 6 confirmation, or "(Determine based on work type)"] } }]
    }
  },
  {
    "object": "block",
    "type": "heading_2",
    "heading_2": {
      "rich_text": [{ "text": { "content": "Dimension Scores" } }]
    }
  },
  {
    "object": "block",
    "type": "paragraph",
    "paragraph": {
      "rich_text": [{
        "text": {
          "content": [Format dimension scores from Phase 6:
            "Impact: [score] - [rationale]\n" +
            "Value: [score] - [rationale]\n" +
            "Strategic Fit: [score] - [rationale]\n" +
            "Urgency: [score] - [rationale]\n" +
            "Effort: [size] - [rationale]\n" +
            "Risk: [score] - [rationale]" +
            (if REVIEW_FLAG: "\n\nProduct validation: [validation summary]")]
        }
      }]
    }
  }
]
```

**Note**: Work Item ID and Work Item Name will be auto-generated by Notion based on TYPE and Name, returned in response.

**Dimension Scores**: Always included (from Phase 3 if no review, from Phase 5 if reviewed)

---

## Phase 8: Extract & Display Result

From the Notion API response, extract:
- **Work Item Name**: `properties["Work Item Name"]` (auto-generated by Notion)

**Display to user**:

**If REVIEW_FLAG = false**:
```
✅ Created [Work Item Name]
Suggested agents: [AGENTS REQUIRED or "none"]
Dimension scores captured for prioritization

Ready to work on it? Use: /b-work [WORK_ITEM_ID]
```

**If REVIEW_FLAG = true**:
```
✅ Created [Work Item Name] (product-validated)
Suggested agents: [AGENTS REQUIRED or "none"]
Dimension scores validated and captured

Ready to work on it? Use: /b-work [WORK_ITEM_ID]
```

**Example outputs**:
```
✅ Created FEAT-27: Simple subscription flow
Suggested agents: compliance, security
Dimension scores captured for prioritization

Ready to work on it? Use: /b-work FEAT-27
```

```
✅ Created FEAT-28: Medication tracking (product-validated)
Suggested agents: compliance, security, clinician
Dimension scores validated and captured

Ready to work on it? Use: /b-work FEAT-28
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

**Dimension Scoring** (NEW):
- Main agent **always** scores all work items using Being's prioritization framework
- Scores: Impact, Value, Strategic Fit, Urgency, Effort, Risk
- Captures rationale for each dimension
- Scores stored in Notion for prioritization (Notion calculates Priority Score via formula)

**Product Validation** (--review flag):
- Optional comprehensive review by product agent
- Validates user story format and benefit alignment
- Enhances acceptance criteria (measurability, completeness, edge cases)
- Calibrates dimension scores against framework examples
- Main agent incorporates feedback and refines work item
- Use when: complex features, strategic work, want extra rigor

**Context Extraction**:
- Command analyzes last 10-20 messages in conversation
- Extracts User Story, Acceptance Criteria, Technical Notes
- Suggests AGENTS REQUIRED based on keyword analysis
- Scores dimensions based on conversation context
- User confirms/edits before creation (no surprises)

**Fallback Behavior**:
- If no context found, placeholders are used (e.g., "(Add user story here)")
- Dimension scoring still performed (best effort from conversation)
- User can edit during confirmation or add details later in Notion UI

**Work Item Structure**:
- Work Item ID follows pattern: `[TYPE]-[NN]` (e.g., FEAT-27, DEBUG-15)
- Work Item Name is auto-generated by Notion
- Dimension scores captured in page content
- Priority Score calculated by Notion formula: `(I × V^1.5 × SF × U) / (E × R)`
- Status defaults to "Not started"

**Best Practice**:
- Discuss feature/bug in conversation first
- Use `/b-create [TYPE] - [Name]` for quick capture with scoring
- Use `/b-create [TYPE] - [Name] --review` for strategic work needing validation
- Confirm and create → dimension scores available for prioritization
- Use `/b-work [WORK_ITEM_ID]` to begin implementation

---

*File location: ~/Development/active/fullmind/.claude/commands/b-create.md*
