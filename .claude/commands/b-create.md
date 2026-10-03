# Create Work Item in Notion

**ARGUMENTS**: `[TYPE] - [Name] [--depth auto|quick|design|full] [--blocked-by ID[,ID...]]` | `--sweep`

`--sweep` takes no other arguments: it rescopes every open item waiting on one — see **Sweep Mode**.

**Types**: FEAT | DEBUG | INFRA | MAINT | AGENT

**Depth** (planning rigor — see Phase 3):
- `auto` *(default)* — orchestrator **deterministically selects** quick/design/full from a keyword/rule table after gathering context (see Phase 2.6). The chosen depth + reason is shown at the confirm step and can be overridden there.
- `quick` — orchestrator extracts, scores, creates. No product agent.
- `design` — product agent runs a segmentation + JTBD pass, then authors the story / AC / score proposals. Orchestrator ratifies.
- `full` — `design` pass **plus** an independent product critique before creation.

Passing any of `quick|design|full` explicitly **forces** that level and skips the Phase 2.6 auto-resolution.

**Examples**:
- `/b-create FEAT - Simple subscription flow`            (auto → resolves in Phase 2.6)
- `/b-create FEAT - Medication tracking --depth design`  (forced)
- `/b-create FEAT - Crisis check-in redesign --depth full` (forced)

**Deprecated**: `--review` is a soft alias for `--depth full` (still works; prefer `--depth full`).

**Database ID**: `${NOTION_WORK_DB}` (defined in `CLAUDE.md`)

---

## Phase 1: Parse Arguments

Parse `$ARGUMENTS` using pattern: `[TYPE] - [Name] [--depth <level>]`

**Extract**:
- TYPE: First word before ` - `
- Name: Everything after ` - ` (excluding any flag tokens)
- DEPTH: value of `--depth` (accepts `--depth design` or `--depth=design`); default `auto`

**Parsing logic**:
0. `--sweep` present → go to **Sweep Mode**; any other argument alongside it is an error.
1. Detect a depth flag anywhere in the arguments:
   - `--depth <level>` or `--depth=<level>` → DEPTH = `<level>` (an explicit `quick|design|full` **forces** and skips Phase 2.6)
   - `--review` (deprecated) → DEPTH = `full` (forced)
   - none present → DEPTH = `auto` (resolved deterministically in Phase 2.6)
2. Detect a blocked-by flag anywhere in the arguments:
   - `--blocked-by <ID[,ID...]>` or `--blocked-by=<...>` → BLOCKED_BY = the list of work item IDs (e.g. `["FEAT-130","MAINT-99"]`)
   - none present → BLOCKED_BY = `[]` (Phase 2 may still infer prerequisites from the conversation)
3. Strip all flag tokens from the argument string.
4. Split the remainder by ` - ` delimiter → TYPE (before), Name (after).

**Validate TYPE**:
- Must be one of: FEAT, DEBUG, INFRA, MAINT, AGENT
- If invalid, error: "Invalid TYPE. Use: FEAT, DEBUG, INFRA, MAINT, or AGENT"

**Validate DEPTH**:
- Must be one of: auto, quick, design, full
- If invalid, error: "Invalid --depth. Use: auto, quick, design, or full"
- `auto` is resolved to a concrete level in Phase 2.6 before Phase 3 branches.

**Examples**:
```
Input: "FEAT - Simple subscription flow"
→ TYPE: "FEAT" | Name: "Simple subscription flow" | DEPTH: "auto"  (resolved in Phase 2.6)

Input: "FEAT - Medication tracking --depth design"
→ TYPE: "FEAT" | Name: "Medication tracking" | DEPTH: "design"  (forced)

Input: "FEAT - Crisis check-in redesign --review"   (deprecated)
→ TYPE: "FEAT" | Name: "Crisis check-in redesign" | DEPTH: "full"  (forced)
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

### Batch Route (set only when the item is outside `/b-batch`'s reach)
Six values, all exclusions. **Leave it empty unless one plainly applies** — empty means "not
yet judged," and there is deliberately no value meaning "batchable."
- `Attended-only` — a diff is producible, but the ACs demand human-*observed* work (bisect build, device run, N consecutive clean runs).
- `Other repo` — the deliverable lives in `being-website` or the design system.
- `Tooling (_bare)` — `.claude/`-only; gitignored on `development`, so no worktree can commit it.
- `Not a code change` — console configuration, an external account, procurement, a founder decision.
- `External blocker` — real work here, blocked by something that is not a work item (a compliance ruling, a scheduling call). Pair with `Status: Blocked`; flipping the status back is what retires it.
- `Release-gated` — the item cannot be **worked** until the next release ships. The reliable test is whether its ACs are written against `main`, or against a build only a release produces — if so, no diff satisfies them today. A specialization of `External blocker`, kept separate so the post-release cohort is identifiable without reading bodies. Pair with `Status: Blocked`; the `Release-gated` view is the worklist to sweep once the release lands.

Setting it now spares `/b-batch` a body fetch and the same re-derivation on every future run.

### AGENTS REQUIRED (keyword suggestion)
Scan Name + context:
- **Crisis/Safety** (`crisis`, `PHQ`, `GAD`, `threshold`, `988`, `suicide`, `safety plan`, `emergency`) → `crisis, compliance`
- **Assessment** (`assessment`, `PHQ-9`, `GAD-7`, `scoring`, `questionnaire`) → `crisis, philosopher`
- **Therapeutic** (`therapeutic`, `Stoic Mindfulness`, `mindfulness`, `virtue`, `breathing`, `body scan`) → `philosopher`
- **Privacy/Data** (`privacy`, `encryption`, `payment`, `PCI`, `consent`, `data export`) → `compliance, security`
- **Performance** (`performance`, `optimize`, `slow`, `lag`, `bundle size`) → `performance`
- **Default**: none (user can add later)

---

## Phase 2.6: Resolve Depth (only when DEPTH = `auto`)

**Skip entirely if DEPTH was forced** (`quick|design|full` passed explicitly, or `--review`). A forced level carries straight into Phase 3.

When DEPTH = `auto`, select a concrete level **deterministically** from the table below. Scan TYPE, Name, and the Phase 2 brief (user-story signals, AC signals, **Technical Notes**). Evaluate **top-down; first match wins**. Record the matched tier + the literal token/path that triggered it as `DEPTH_REASON` (shown in Phase 6).

Matching is **case-insensitive, substring** against Name + brief text (same convention as the AGENTS REQUIRED scan).

| # | Match condition (first to fire wins) | → DEPTH | Rationale |
|---|---|---|---|
| 0 | **Safety-adjacent tooling.** TYPE = `INFRA`/`MAINT`/`DEBUG` **AND** Name matches `gate`, `harness`, `worktree`, `simulator`, `DerivedData`, `lease`, `CI`, `build`, `assert`, `.maestro` **AND** Technical Notes reference no protected path | `quick` | Tooling that protects safety code is not safety code. The protected-path guard, not the TYPE list, is what keeps a real crisis-behaviour bug in Tier 1. |
| 1 | **Safety / regulated.** Any keyword: `crisis`, `PHQ`, `PHQ-9`, `GAD`, `GAD-7`, `threshold`, `988`, `suicide`, `self-harm`, `safety plan`, `emergency`, `intervention`, `assessment`, `scoring`, `questionnaire`, `encryption`, `consent`, `data export`, `privacy`, `PCI`, `payment` — **OR** Technical Notes reference a protected path (`features/crisis/`, `features/assessment/`, `core/services/security/`) | `full` | Highest-stakes / compliance-adjacent — warrants an independent product critique. |
| 2 | **User-facing FEAT.** TYPE = `FEAT` **AND** any user-facing-surface keyword: `practices`, `breathing`, `body scan`, `mindfulness`, `learn`, `onboarding`, `check-in`, `journal`, `reflection`, `profile`, `settings`, `paywall`, `subscription`, `UI`, `screen`, `flow`, `experience`, `notification` | `design` | Audience + JTBD genuinely shape the design — run segmentation. |
| 3 | **Default.** Anything else — `INFRA`, `MAINT`, `DEBUG`, `AGENT`, or a `FEAT` with no user-facing signal (backend/mechanical) | `quick` | Fast capture; no product agent needed. |

**Notes on determinism**:
- The table is the *only* input — do not let conversational tone or perceived importance override a tier. If you believe the table mis-fired, surface it in Phase 6 (the user can `edit` the depth), don't silently deviate.
- Tier 1 keywords are a **superset-aligned** subset of the AGENTS REQUIRED Crisis/Safety + Assessment + Privacy/Data groups, so depth and agent-suggestion never disagree on what's "safety-adjacent."
- A bare `FEAT` with no Tier-1 or Tier-2 keyword falls to `quick` (Tier 3) by design — purely backend features don't need a JTBD pass.

After resolving, set DEPTH to the matched level and continue. Everything downstream (Phase 3 branch, Phase 6 display, Phase 7 content) keys on the resolved `quick|design|full`.

---

## Dimension Reference (shared by Phase 3)

Score each dimension using Being's prioritization framework (`docs/product/prioritization-framework-v2.md`). Notion calculates Priority via `(I × V^1.5 × SF × U) / (E × R)`.

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
📋 Work Item: [TYPE] - [Name]  (depth: [quick|design|full][if auto-resolved: " — auto: [DEPTH_REASON]"][if forced: " — forced"])

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
- edit: Provide corrections (Claude will prompt for each field, including Depth)
```

**If user selects "edit"**: prompt per field (Depth / User Story / Acceptance Criteria / Technical Notes / AGENTS REQUIRED / Segments & Jobs / Dimension Scores — Enter to skip each).

**Depth override at edit**: if the user changes Depth to a level that requires a pass not yet run (`auto`/`quick` → `design`/`full`), re-enter Phase 3B (and Phase 4 if `full`) before re-displaying. Lowering depth just drops the unused artifacts.

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
      "Effort": "[Effort size]",
      "Batch Route": "[value from Phase 2 — OMIT this key entirely if none applies]"
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

**Read the ID back.** `create-pages` returns only `page_id`, and `properties["Work Item ID"]` is a
formula that reads back as a `formulaResult://` sentinel, never the value. `notion-fetch` the new
page and build the ID from `userDefined:ID`: `[TYPE]-[userDefined:ID]` (e.g. `MAINT` + `437` →
`MAINT-437`). Never predict it from the last ID seen — peer sessions create items concurrently.

```
mcp__notion__notion-update-page
data: {
  "page_id": "[page_id]",
  "command": "insert_content",
  "position": {"type": "start"},
  "content": "## Work Item ID: [WORK_ITEM_ID]\n"
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

Display `[WORK_ITEM_ID]: [Name]` from Phase 7.5's ID and Phase 1's Name — `Work Item Name` is a
formula too and reads back as a sentinel.

```
✅ Created [WORK_ITEM_ID]: [Name]  (depth: [quick|design|full])
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

## Phase 8.5: Depth-Table Retrospective (conditional, narrowly scoped)

**Scope: the Phase 2.6 table and its keyword lists ONLY.** No other part of this skill
self-improves — the rest is a stable capture pipeline.

Fires **only** when the auto-resolution demonstrably missed:
- The user **overrode** the resolved depth at the Phase 6 confirm (`edit` → different depth), or
- The user states the resolved depth was wrong (including feedback arriving later,
  e.g. a `quick`-scored item that turned out to need a design pass during `/b-work`).

A forced `--depth` flag is **not** a signal — forcing expresses preference, not a table miss.

**If it fires:**
1. Identify the miss: which tier fired (or fell through), and what token/signal in the
   Name + brief *should* have routed it correctly.
2. Draft the smallest table edit — usually one keyword added to Tier 1 or Tier 2, or a
   keyword moved. **Keyword only: no explanatory prose, no worked example** — the
   rationale belongs in the proposal and the commit message, never in the file.
   Preserve the determinism notes: Tier 1 must stay superset-aligned with
   the AGENTS REQUIRED safety groups (update both together if the keyword is safety-adjacent).
3. Present as a diff: the miss (item, resolved vs. correct depth, why), the edit, and a
   quick check that the new keyword doesn't over-trigger on common backend terms.
4. **Never auto-apply, and apply EXACTLY the approved text** — "make it concise" means
   trim what was shown, never rewrite or add. On decline, drop it — do not re-propose.

---

## Sweep Mode (`--sweep`)

Finds every open item waiting on a rescope, plans them together, applies after one review.
Phases 2–8 do not run as a pipeline; S3 and S6 reuse Phase 2.6, 3–5 and 7–7.6 per item.

### S1: Find candidates

Two sources, unioned — neither alone is complete:

1. **Body marker.** `notion-search` for `RE-SCOPE REQUIRED` in `collection://${NOTION_WORK_DB}`
   (`page_size: 50`) — the heading `/b-batch` Step 2.3 writes when it defers on a re-scope
   finding. Nothing retires that heading when the work lands, so hits include closed items: keep
   one only if its row is in the view below.
2. **Comment-only requests.** Search indexes bodies, **not comments** (measured 2026-10-02).
   Read the `Batched` view (`view://3b7a1108-c208-8055-bc9b-000cfccdb28e`, `mode: "view"`, never
   SQL — `/b-batch` Step 0.1a) and hand every row to **one subagent**: `notion-get-comments`
   (`include_all_blocks: true`) per row, returning only rows where an unresolved comment asks for
   a rescope, re-slice, split, scope-down or cancel decision — ID, page URL, comment datetime,
   the request quoted verbatim. Tell it to include borderline rows: S2 drops a false hit cheaply,
   a miss is silent.

Keep each candidate's view row — Status, Effort, Batch Route and both relations come with it.

**Drop, naming each:**
- Owned by a live session — `Status: Batched`, an ID in a live
  `/Users/max/dev/being/.config/.b-batch-state.*.json` (`state ∉ {done, deferred}`), or an open
  PR on its branch.
- Already resolved — a later comment or body section settles the request (a scope-down, a ruling
  that answers it, a follow-up that took the remainder).

    🔎 Rescope candidates: <ID> (marker) · <ID> (comment, <date>)
       Dropped: <ID> (owned: Batched) · <ID> (resolved by <date> scope-down)

None left → say so and stop.

### S2: Load and re-verify

Per candidate, `notion-fetch` the body and `notion-get-comments` (`include_all_blocks: true`).
Read newest-last, comments override the body, and apply `/b-work` Step 1.3's truncation rule.
Record each page's `Last edited time` for S6.

**Fan this out** to parallel read-only subagents grouped by item family (shared epic, shared
panel), each returning per item: properties, `Last edited time`, the request quoted, every AC
numbered, each finding `holds`/`stale`, recorded rulings, open questions and a proposed verdict.
Bodies loaded here crowd out S3–S5.

**Re-verify before carrying a finding.** A rescope section usually pins `development @ <sha>`:
run `git log --oneline <sha>..origin/development -- <cited paths>`, and for any path that moved,
re-read the cited lines and mark the finding `holds` or `stale`. Resolve every item ID the findings
name against the view rows in hand (fallback: `/b-work`'s lookup) — a split the rescope asks for
may already exist.

### S3: Plan each item

| Verdict | When | Writes |
|---|---|---|
| `rewrite` | ACs or notes change; still one PR | sections amended in place, same ID |
| `split` | too large, or parts with different gates or routes | original narrowed to the first slice; new items for the rest |
| `cancel` | the premise is retired | `Status: Cancelled` + comment naming why and any successor |
| `resolved` | settled by a merge, comment or existing item | marker retired only |
| `decision` | turns on a call only the founder can make | nothing until answered (below) |

**Ask every `decision` before authoring** — one `AskUserQuestion` round, four per call, covering
each `decision` and any fork S2 exposed. Answers change what gets written; asking after
authoring costs a second review.

Run the normal pipeline — Phase 2.6, then 3A, or 3B → (4) → 5 — for every **new** item and
slice, and for a `rewrite` that changes what the item delivers. A `rewrite` that only corrects
stale facts is authored from S2's re-verified findings. The brief is body + comments + rescope
section. **Recorded rulings are constraints, not proposals** — pass them as fixed; one the agent
disputes becomes a `decision`, never an AC change. Run each wave (all 3B passes, then all
Phase 4 critiques) as parallel Agent calls in one message. Every slice gets its own scores and
edges, and its Technical Notes carry the rulings that bind it — `/b-work` reads only that slice's
body.

### S4: Reconcile across the set

1. **AC ledger.** One row per AC in every original body: `kept` · `moved → <item>` ·
   `dropped — <reason>`. An AC with no row blocks S5 — a narrowed item still closes `Done`, so an
   AC that fell off is lost work nobody sees.
2. **Dedupe** proposed new items against each other and the view rows; reuse an existing item
   rather than create a twin.
3. **Overlap.** Two items claiming the same AC or file path → one owner, recorded in both.
4. **Edges.** Rewire across the whole set: a downstream `Blocked by` points at the slice that
   actually unblocks it. No cycles.
5. **Batch Route.** Re-derive per item and slice (Phase 2 rules); a rescope often changes it.
6. **Found defects.** A defect verified in code that belongs to no candidate goes to S5 as an
   optional new item — never folded into a candidate's ACs.
7. **Owned items.** When a finding changes the premise of an item S1 dropped as owned, offer in
   S5 to append a dated `RE-SCOPE REQUIRED` section and a short comment — never its ACs or
   properties. Its owner's next run reads both.

### S5: One review

```
♻️  <ID> <Name> — <verdict>  (depth: <level> — <reason>)
   AC ledger: n kept · n moved · n dropped   [each moved/dropped AC with destination or reason]
   New: <TYPE> - <Name>  (I/V/SF/U/E/R)  · Blocked by <IDs>
   Edges: <+/- changes>   Batch Route: <old → new>   Status: <old → new>
   Stale findings: <list, or "none">
```

Then `AskUserQuestion`: the items to apply, as multiSelect questions of up to four items each. A
fork that authoring surfaced goes first in the same round; its item re-enters S3 alone and is
shown again before it applies. Unselected items are left untouched, marker included.

### S6: Apply

Create new items first, then read every new `userDefined:ID` back (one SQL
`WHERE "userDefined:ID" >= <last known>` call) before writing a header or a pointer — peer
sessions create items concurrently, so IDs are never sequential or predictable. A reciprocal
`Blocking` fill does not move the original's `Last edited time` (measured), so the guard holds.
Then, per approved item, prerequisites before the items that point at them:

1. **Clobber guard.** Re-fetch; if `Last edited time` moved since S2, skip the item and report
   it — a peer wrote it, and S3 planned against the old body.
2. **Body.** `notion-update-page` `update_content`, section by section; never `replace_content`,
   which erases whatever the plan did not read. Replacing ACs strands the rest of the body: add
   a `Superseded where it conflicts with the <date> ACs` line at the top of Technical Notes, and
   bring the Dimension Scores text and any slice map in line with the properties.
3. **Retire the marker.** Retitle the `RE-SCOPE REQUIRED` heading to
   `Re-scope applied — <today> (/b-create --sweep): <verdict>, <new IDs>`, keeping the rulings
   beneath it as provenance. A comment-only candidate gets that section added — the body is what
   `/b-work` reads.
4. **New items** via Phase 7 → 7.5 → 7.6.
5. **Properties.** `Name` if the scope moved, scores, `Effort`, `Batch Route` (set or clear),
   edges; `Status` `Blocked → Not started` when the rescope was the only blocker, `Cancelled`
   for `cancel`.
6. **Comment** on the original, under 500 characters: verdict, new IDs, where the detail lives.

A failed write warns and moves on; never retry blindly.

```
✅ Sweep: N applied · N skipped
   <ID> rewrite · <ID> split → <ID>, <ID> · <ID> cancelled · <ID> resolved
   ⚠️ <ID> skipped — edited since planning (re-run --sweep)
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
Valid levels: auto, quick, design, full
```

**Missing Name**:
```
❌ Invalid format. Use: /b-create [TYPE] - [Name] [--depth auto|quick|design|full]  |  /b-create --sweep
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
- `auto` (default) — Phase 2.6 deterministically resolves to one of the levels below via a keyword/rule table (Tier 1 safety/regulated → `full`; Tier 2 user-facing FEAT → `design`; Tier 3 everything else → `quick`), first-match-wins. The resolution + reason is shown at the confirm step and is overridable via `edit`.
- `quick` — orchestrator authors + scores from conversation context. No product agent. Fast capture.
- `design` — product agent runs segmentation + JTBD, then authors the story / AC / proposed scores. Orchestrator ratifies against Being's framework. Use for features where *who it's for* and *what job it does* genuinely shape the design.
- `full` — `design` plus an independent product critique (a fresh agent that did not write the draft) before creation. Use for strategic / high-risk / safety-adjacent work wanting maximum rigor.
- Passing `quick|design|full` explicitly **forces** that level (skips Phase 2.6). `--review` is a deprecated alias for `--depth full`.

**Why a keyword/rule table (not LLM judgment)**: "deterministic" here means *same input → same depth, every run, auditable*. The table is the sole input; the orchestrator does not let tone or perceived importance override a tier. Brittleness on novel phrasing is the accepted trade-off — the confirm-step `edit` is the escape hatch.

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
- Leave depth on `auto` (default) and let Phase 2.6 pick; override with `--depth quick|design|full` only when you want to force a level against the table.
- Confirm → create → `/b-work [WORK_ITEM_ID]` to implement.

---

*File location: /Users/max/dev/being/.claude/commands/b-create.md*
