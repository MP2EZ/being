# Create Work Item in Notion

**ARGUMENTS**: `[TYPE] - [Name] [--depth quick|design|full] [--blocked-by ID[,ID...]]`

**Types**: FEAT | DEBUG | INFRA | MAINT | AGENT

**Depth** (planning rigor — see Phase 3):
- `quick` *(default)* — orchestrator extracts, scores, creates. No product agent.
- `design` — product agent runs a segmentation + JTBD pass, then authors the story / AC / score proposals. Orchestrator ratifies.
- `full` — `design` pass **plus** an independent product critique before creation.

**Examples**:
- `/b-create FEAT - Simple subscription flow`
- `/b-create FEAT - Medication tracking --depth design`
- `/b-create FEAT - Crisis check-in redesign --depth full`

**Deprecated**: `--review` is a soft alias for `--depth full` (still works; prefer `--depth full`).

**Database ID**: `${NOTION_WORK_DB}` (defined in `CLAUDE.md`)

---

## Phase 1: Parse Arguments

Parse `$ARGUMENTS` using pattern: `[TYPE] - [Name] [--depth <level>]`

**Extract**:
- TYPE: First word before ` - `
- Name: Everything after ` - ` (excluding any flag tokens)
- DEPTH: value of `--depth` (accepts `--depth design` or `--depth=design`); default `quick`

**Parsing logic**:
1. Detect a depth flag anywhere in the arguments:
   - `--depth <level>` or `--depth=<level>` → DEPTH = `<level>`
   - `--review` (deprecated) → DEPTH = `full`
   - none present → DEPTH = `quick`
2. Detect a blocked-by flag anywhere in the arguments:
   - `--blocked-by <ID[,ID...]>` or `--blocked-by=<...>` → BLOCKED_BY = the list of work item IDs (e.g. `["FEAT-130","MAINT-99"]`)
   - none present → BLOCKED_BY = `[]` (Phase 2 may still infer prerequisites from the conversation)
3. Strip all flag tokens from the argument string.
4. Split the remainder by ` - ` delimiter → TYPE (before), Name (after).

**Validate TYPE**:
- Must be one of: FEAT, DEBUG, INFRA, MAINT, AGENT
- If invalid, error: "Invalid TYPE. Use: FEAT, DEBUG, INFRA, MAINT, or AGENT"

**Validate DEPTH**:
- Must be one of: quick, design, full
- If invalid, error: "Invalid --depth. Use: quick, design, or full"

**Examples**:
```
Input: "FEAT - Simple subscription flow"
→ TYPE: "FEAT" | Name: "Simple subscription flow" | DEPTH: "quick"

Input: "FEAT - Medication tracking --depth design"
→ TYPE: "FEAT" | Name: "Medication tracking" | DEPTH: "design"

Input: "FEAT - Crisis check-in redesign --review"   (deprecated)
→ TYPE: "FEAT" | Name: "Crisis check-in redesign" | DEPTH: "full"
```

---

## Phase 2: Gather Context from Conversation

**Always performed.** Analyze the last 10-20 messages and distill a **brief**. In `quick` mode the orchestrator authors directly from this; in `design`/`full` this brief is the raw material handed to the product agent (which is context-isolated and cannot see the conversation).

Extract:

### User Story signals
Problem statements ("I need to…", "Users want to…"), feature requests ("Add ability to…"), pain points ("Currently X is difficult…").

### Acceptance Criteria signals
Success conditions ("It should…", "When X happens…"), requirements ("Must include…"), test scenarios ("If…", "Given…").

### Technical Notes
Implementation details, constraints (perf budgets, encryption), technical decisions, dependencies / blockers.

### Prerequisites (Blocked by)
Identify any **work items that must land before this one**. Sources, unioned:
- The `--blocked-by` flag (explicit, authoritative).
- Conversation phrasing: "after X lands", "depends on X", "blocked by X", "builds on X",
  "needs X first", or a bare work item ID cited as a precondition.
Collect these as a list of work item IDs (e.g. `MAINT-237`, `INFRA-232`). This becomes the
structured **`Blocked by`** relation in Phase 7.6 — not just prose in Technical Notes, so
`/b-batch` can read it directly. If a true dependency is only describable in prose, still
note it in Technical Notes *and* list the ID here. Empty is fine — most items have no prereqs.

### AGENTS REQUIRED (keyword suggestion)
Scan Name + context:
- **Crisis/Safety** (`crisis`, `PHQ`, `GAD`, `threshold`, `988`, `suicide`, `safety plan`, `emergency`) → `crisis, compliance`
- **Assessment** (`assessment`, `PHQ-9`, `GAD-7`, `scoring`, `questionnaire`) → `crisis, philosopher`
- **Therapeutic** (`therapeutic`, `Stoic Mindfulness`, `mindfulness`, `virtue`, `breathing`, `body scan`) → `philosopher`
- **Privacy/Data** (`privacy`, `encryption`, `payment`, `PCI`, `consent`, `data export`) → `compliance, security`
- **Performance** (`performance`, `optimize`, `slow`, `lag`, `bundle size`) → `performance`
- **Default**: none (user can add later)

---

## Dimension Reference (shared by Phase 3)

Score each dimension using Being's prioritization framework (`docs/product/prioritization-framework.md`). Notion calculates Priority via `(I × V^1.5 × SF × U) / (E × R)`.

- **Impact (1-5)** — business outcome magnitude: 5=Transformative, 4=Significant, 3=Moderate, 2=Minor, 1=Negligible
- **Value (1-5)** — user benefit (weighted 1.5×): 5=Critical Need, 4=Significant Need, 3=Noticeable Benefit, 2=Quality of Life, 1=Cosmetic
- **Strategic Fit (1-5)** — Stoic Mindfulness / mission alignment: 5=Mission Essential, 4=Core Strategy, 3=Aligned, 2=Peripheral, 1=Tangential
- **Urgency (1-5)** — deadline pressure: 5=Critical Blocker, 4=Hard Deadline, 3=Target Window, 2=Opportunistic, 1=No Deadline
- **Effort (XS/S/M/L/XL/XXL)** — XS=1pt (~1wk), S=2pt (1-2wk), M=3pt (2-3wk), L=5pt (3-5wk), XL=8pt (5-8wk), XXL=13pt (8+wk)
- **Risk (1-5)** — technical/domain/operational: 5=Critical Risk, 4=High Risk, 3=Moderate Complexity, 2=Some Unknowns, 1=Low Risk

Each dimension gets a 1-sentence rationale.

---

## Phase 3: Author the Work Item — branches by DEPTH

### Phase 3A — DEPTH = quick

The orchestrator authors directly from the Phase 2 brief:
- **User Story**, **Acceptance Criteria** (3-5, measurable), **Technical Notes**, **AGENTS REQUIRED**.
- **Dimension Scores** — all six (see Dimension Reference) with rationale.

Then go to Phase 6.

### Phase 3B — DEPTH = design or full (the Design Pass)

Spawn the **product** agent for a segmentation + JTBD pass that authors the work item. The product agent is context-isolated, so the prompt MUST carry: (1) the distilled conversation brief, (2) the Dimension Reference rubric, (3) TYPE + Name.

**Prompt to product agent**:
```
Run a design-thinking pass for this work item, then author it.

WORK ITEM: [TYPE] - [Name]

CONVERSATION BRIEF (distilled by orchestrator — this is your only window into the conversation):
[Phase 2 brief: user-story signals, AC signals, technical notes, suggested agents]

SCORING RUBRIC (score against this — Being is pre-launch, safety-first, Stoic Mindfulness):
[paste the Dimension Reference block]

TASKS:

1. SEGMENTATION — Identify 1-3 user segment(s) this serves. For each: a short name + 1-line defining traits.

2. JOBS (JTBD) — For each segment, state 1-3 jobs in the form:
   "When [situation], I want to [motivation], so I can [expected outcome]."
   Give ONE success metric per job (how we'd know the job is done well). Keep it lean — no forces analysis.

3. USER STORY — Author an "As a [user], I want [goal], so that [benefit]" story grounded in the jobs.

4. ACCEPTANCE CRITERIA — 3-6 measurable, testable criteria. Each must trace to a job above. Include safety/therapeutic criteria where the domain demands it.

5. TECHNICAL NOTES — Carry/refine technical context from the brief.

6. AGENTS REQUIRED — Suggested specialist agents (crisis/compliance/philosopher/security/performance) or "none".

7. PROPOSED DIMENSION SCORES — All six per the rubric, each with a 1-sentence rationale.

RETURN FORMAT (structured):

**Segments**:
- [Name]: [traits]

**Jobs**:
- [Segment] — When [situation], I want to [motivation], so I can [outcome].  ↳ success: [metric]

**User Story**: [story]

**Acceptance Criteria**:
- [criterion]  (job: [which job])

**Technical Notes**: [notes]

**AGENTS REQUIRED**: [list or none]

**Proposed Dimension Scores**:
- Impact: [1-5] — [rationale]
- Value: [1-5] — [rationale]
- Strategic Fit: [1-5] — [rationale]
- Urgency: [1-5] — [rationale]
- Effort: [XS-XXL] — [rationale]
- Risk: [1-5] — [rationale]
```

**If DEPTH = design** → go to Phase 5 (orchestrator ratification).
**If DEPTH = full** → go to Phase 4 (validation pass) first.

---

## Phase 4: Validation Pass — DEPTH = full only

Spawn a **fresh** `product` agent (independent context — it did NOT write the draft, so it critiques rather than defends) to stress-test the authored artifacts.

**Prompt to product agent**:
```
Critique this authored work item for product quality and calibration. You are an independent reviewer — be skeptical.

WORK ITEM: [TYPE] - [Name]

AUTHORED ARTIFACTS (from the design pass):
[Segments, Jobs, User Story, Acceptance Criteria, Technical Notes, AGENTS REQUIRED, Proposed Dimension Scores]

SCORING RUBRIC:
[paste the Dimension Reference block]

REVIEW TASKS:
1. Segments & Jobs — Are the segments distinct and real? Does each job follow the JTBD form with a meaningful success metric? Any missing job?
2. User Story — Correct format, user-centric, benefit aligned to Being's therapeutic mission?
3. Acceptance Criteria — Measurable, testable, complete (happy path + edge cases)? Each traceable to a job? Safety/therapeutic gaps?
4. Dimension Scores — Calibrated to the rubric and Being's pre-launch, safety-first context?

RETURN FORMAT:
**Segments & Jobs Review**: [APPROVE / REFINE: …]
**User Story Review**: [APPROVE / REFINE: …]
**Acceptance Criteria Review**: [APPROVE / ENHANCE: …]
**Dimension Score Reviews**:
- Impact: [AGREE / ADJUST to X because…]
- Value: [AGREE / ADJUST to X because…]
- Strategic Fit: [AGREE / ADJUST to X because…]
- Urgency: [AGREE / ADJUST to X because…]
- Effort: [AGREE / ADJUST to X because…]
- Risk: [AGREE / ADJUST to X because…]
**Cross-Cutting Notes**: […]
```

---

## Phase 5: Orchestrator Ratification — DEPTH = design or full

The orchestrator is the authority on Being-specific calibration. Reconcile the authored artifacts (and the Phase 4 critique, if `full`) into a final work item:

1. **Ratify scores** against the rubric + Being's pre-launch, safety-first context. Override any proposed score with a 1-sentence reason if mis-calibrated.
2. **Finalize AC wording** — ensure measurable and traceable.
3. **Enforce terminology** — "wellness data" not "PHI"; "AES-256 encryption" not "HIPAA-compliant encryption"; "wellness screening" not "clinical assessment".
4. **Confirm AGENTS REQUIRED** against the Validation Matrix in `CLAUDE.md`.

Carry forward the final **Segments** and **Jobs** for display + persistence.

---

## Phase 6: Display & Confirm

```
📋 Work Item: [TYPE] - [Name]  (depth: [quick|design|full])

[If depth ≥ design:]
**Segments & Jobs**:
- [Segment]: [traits]
  - When [situation], I want to [motivation], so I can [outcome].  ↳ success: [metric]

**User Story**:
[final user story, or "(No clear user story found in conversation)"]

**Acceptance Criteria**:
[final criteria as bulleted list, or "(No criteria found in conversation)"]

**Technical Notes**:
[final technical notes, or "(No technical notes found in conversation)"]

**AGENTS REQUIRED**: [agents, or "none"]

**Blocked by**: [intended prereq IDs, or "none"]  (resolved + linked in Phase 7.6; unresolved IDs warned there)

**Dimension Scores**:
- Impact: [score] - [rationale]
- Value: [score] - [rationale]
- Strategic Fit: [score] - [rationale]
- Urgency: [score] - [rationale]
- Effort: [size] - [rationale]
- Risk: [score] - [rationale]

[If depth = full:]
Validation summary: [concise bullets of what was refined/enhanced/validated]

---
Does this look correct? (y/n/edit)
- y: Create work item as shown
- n: Cancel creation
- edit: Provide corrections (Claude will prompt for each field)
```

**If user selects "edit"**: prompt per field (User Story / Acceptance Criteria / Technical Notes / AGENTS REQUIRED / Segments & Jobs / Dimension Scores — Enter to skip each).

**If "n"**: `❌ Work item creation cancelled.`

**If "y"**: proceed to Phase 7.

---

## Phase 7: Create Page in Notion

NOTE: The Notion API uses Notion-flavored Markdown for page content. To update content after creation, use `notion-update-page` with `replace_content` / `replace_content_range`.

```
mcp__notion__notion-create-pages
parent: {
  "data_source_id": "${NOTION_WORK_DB}"
}
pages: [
  {
    "properties": {
      "Name": "[Name from Phase 1]",
      "Type": "[TYPE from Phase 1]",
      "Status": "Not started",
      "Impact": [Impact score],
      "Value": [Value score],
      "Strat Fit": [Strategic Fit score],
      "Urgency": [Urgency score],
      "Risk": [Risk score],
      "Effort": "[Effort size]"
    },
    "content": "[See content template below]"
  }
]
```

**Content template** (Notion-flavored Markdown, `\n` newlines). Include the `## Segments & Jobs` section **only when DEPTH ≥ design**:

```
[if depth ≥ design:]## Segments & Jobs
**Segment:** [name] — [traits]
**Job:** When [situation], I want to [motivation], so I can [outcome].
  ↳ success: [metric]
(repeat per job)

## User Story
[User Story, or "(Add user story here)"]

## Acceptance Criteria
[Acceptance Criteria, or "(Add acceptance criteria here)"]

## Technical Notes
[Technical Notes, or "(Add technical notes here)"]

## AGENTS REQUIRED
[AGENTS REQUIRED, or "(Determine based on work type)"]

## Dimension Scores
Impact: [score] - [rationale]
Value: [score] - [rationale]
Strategic Fit: [score] - [rationale]
Urgency: [score] - [rationale]
Effort: [size] - [rationale]
Risk: [score] - [rationale]
[if depth = full: "\n\nProduct validation: [validation summary]"]
```

**Note**: Work Item ID and Work Item Name are auto-generated by Notion based on TYPE and Name, returned in the response.

---

## Phase 7.5: Add Searchable Work Item ID

After page creation, insert the Work Item ID header so `/b-work` can find it via semantic search.

**Extract from response**: `page_id`; Work Item ID from `properties["Work Item ID"]` (formula, e.g. "MAINT-140").

```
mcp__notion__notion-update-page
data: {
  "page_id": "[page_id]",
  "command": "insert_content_after",
  "selection_with_ellipsis": "",
  "new_str": "## Work Item ID: [WORK_ITEM_ID]\n\n"
}
```

**Error handling**: if update fails, log a warning and continue (page still created): "⚠️ Could not add searchable ID (page created successfully)".

---

## Phase 7.6: Link `Blocked by` Prerequisites (Conditional)

**Skip entirely if BLOCKED_BY (Phase 2) is empty.**

For each prerequisite work item ID in BLOCKED_BY:
1. **Resolve to a page** — reuse `/b-work`'s lookup: search `Work Item ID: <ID>` in
   `collection://${NOTION_WORK_DB}`, `notion-fetch` the candidate, verify its
   `userDefined:ID` + `Type` match the parsed ID. Collect the resolved page URL.
2. **Not found** → emit `⚠️ Blocked-by prerequisite <ID> not found — recorded in
   Technical Notes only, relation NOT set` and skip that one. Never block creation.

Then set the **`Blocked by`** relation in one update (array of resolved page URLs):

```
mcp__notion__notion-update-page
data: {
  "page_id": "[page_id from Phase 7.5]",
  "command": "update_properties",
  "properties": {
    "Blocked by": ["[resolved prereq page URL]", "…"]
  }
}
```

`Blocked by` is a **two-way** relation, so Notion auto-populates the reciprocal
`Blocking` on each prerequisite — do **not** set `Blocking` yourself. Only set what was
clearly identified; never invent an edge.

**Emit:**
```
🔗 Blocked by: <ID> (linked) · <ID> (⚠️ not found — notes only)   [or "none"]
```

**Error handling**: if the relation update fails, warn and continue (page is already
created): "⚠️ Could not set Blocked by relation (page created; link manually in Notion)".

---

## Phase 8: Extract & Display Result

From the response, extract **Work Item Name** (`properties["Work Item Name"]`).

```
✅ Created [Work Item Name]  (depth: [quick|design|full])
Suggested agents: [AGENTS REQUIRED or "none"]
[if depth ≥ design: "Segments & jobs captured · "]Dimension scores captured for prioritization

Ready to work on it? Use: /b-work [WORK_ITEM_ID]
```

**Example**:
```
✅ Created FEAT-28: Medication tracking  (depth: design)
Suggested agents: compliance, security
Segments & jobs captured · Dimension scores captured for prioritization

Ready to work on it? Use: /b-work FEAT-28
```

---

## Error Handling

**Invalid TYPE**:
```
❌ Invalid TYPE: "FEATURE"
Valid types: FEAT, DEBUG, INFRA, MAINT, AGENT
```

**Invalid --depth**:
```
❌ Invalid --depth: "deep"
Valid levels: quick, design, full
```

**Missing Name**:
```
❌ Invalid format. Use: /b-create [TYPE] - [Name] [--depth quick|design|full]
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

**Depth ladder**:
- `quick` (default) — orchestrator authors + scores from conversation context. No product agent. Fast capture.
- `design` — product agent runs segmentation + JTBD, then authors the story / AC / proposed scores. Orchestrator ratifies against Being's framework. Use for features where *who it's for* and *what job it does* genuinely shape the design.
- `full` — `design` plus an independent product critique (a fresh agent that did not write the draft) before creation. Use for strategic / high-risk / safety-adjacent work wanting maximum rigor.
- `--review` is a deprecated alias for `--depth full`.

**Authoring ownership**:
- In `design`/`full`, the **product agent authors** the story, AC, and proposed scores — it carries the JTBD lens straight through to the criteria, with no handoff fidelity loss.
- The **orchestrator ratifies**: it owns Being-framework calibration, terminology compliance, AGENTS REQUIRED against the Validation Matrix, and page creation. The product agent proposes; the orchestrator decides.
- The product subagent is **context-isolated** — the orchestrator must pass it the distilled conversation brief and the scoring rubric in the prompt, or it flies blind.

**Segments & Jobs persistence**:
- Captured into a `## Segments & Jobs` section in the Notion page (design/full only), so the design thinking carries into `/b-work`.

**Work Item structure**:
- Work Item ID pattern: `[TYPE]-[NN]` (e.g. FEAT-27). Name auto-generated by Notion.
- Priority Score via Notion formula: `(I × V^1.5 × SF × U) / (E × R)`. Status defaults to "Not started".

**Best practice**:
- Discuss the feature/bug in conversation first.
- `quick` for fast capture; `--depth design` when the design benefits from segmentation + JTBD; `--depth full` for strategic work needing an independent critique.
- Confirm → create → `/b-work [WORK_ITEM_ID]` to implement.

---

*File location: /Users/max/dev/being/.claude/commands/b-create.md*
