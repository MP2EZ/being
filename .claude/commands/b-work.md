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

> **Why this needs care:** the Notion MCP has **no exact-ID query** — `notion-search` is
> semantic only and returns a recency-weighted candidate set. The embedding for
> "MAINT-168" is nearly identical to "MAINT-200", so the correct row is often *not* the
> top hit, and for older/Done items it can be absent from the first page entirely. Never
> trust rank or the highlight snippet; always scan candidates by property (Step 1.3), and
> never conclude "not found" from the top result alone. (The real unique key is
> `userDefined:ID`; "Work Item ID" is a display formula `Type-ID`.)

Primary search — matches the `## Work Item ID: MAINT-140` header that `/b-create` writes,
with a wide page size so the right row is in the candidate set even when it isn't ranked first:

```
mcp__notion__notion-search
query: "Work Item ID: [WORK_ITEM_ID]"
data_source_url: "collection://${NOTION_WORK_DB}"
page_size: 25
max_highlight_length: 0
```

---

### Step 1.3: Verify & Select Result

Fetch candidates and match on **properties, not rank**:

```
mcp__notion__notion-fetch
id: [candidate page_id from Step 1.2]
```

**Check properties:**
- `Type` equals parsed TYPE
- `userDefined:ID` equals parsed ID_NUMBER   ← the real unique key

**If a candidate matches**: use this page_id, proceed to Step 1.4.

**If no candidate matches**, retry the search **once**, recency-biased (a recently-edited
item floats to the top of the semantic set), then re-scan by property:
```
mcp__notion__notion-search
query: "[WORK_ITEM_ID] [topic words if known]"
data_source_url: "collection://${NOTION_WORK_DB}"
query_type: "internal"
content_search_mode: "ai_search"
page_size: 25
```

**If still no match after the retry**: do NOT keep churning searches and do NOT report a
bare "not found" — semantic search genuinely cannot always surface a cold ID. STOP and ask:
> "Couldn't resolve [WORK_ITEM_ID] via search (the Notion MCP has no exact-ID query).
> Paste the Notion page link and I'll fetch it directly."

Then `notion-fetch` the pasted URL and confirm `userDefined:ID` equals ID_NUMBER before proceeding.

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

# Use -e (follows the link) not -L (true for ANY symlink, including a
# dangling one) so a stale/broken link is repaired, not just an absent one.
# -f overwrites an existing dangling symlink (`ln -s` alone errors "File exists").
if [ ! -e "app/.env.production" ]; then
  ln -sf ../../.config/.env.production app/.env.production
  [ -e "app/.env.production" ] \
    && echo "✅ Symlinked app/.env.production -> ~/dev/being/.config/.env.production" \
    || echo "⚠️  app/.env.production target missing — create ~/dev/being/.config/.env.production"
else
  echo "✓ app/.env.production already resolves"
fi
if [ ! -e "app/.env.development" ]; then
  ln -sf ../../.config/.env.development app/.env.development
  [ -e "app/.env.development" ] \
    && echo "✅ Symlinked app/.env.development -> ~/dev/being/.config/.env.development" \
    || echo "⚠️  app/.env.development target missing — create ~/dev/being/.config/.env.development"
else
  echo "✓ app/.env.development already resolves"
fi
```

The guard uses `-e` (which follows the symlink), not `-L`, so re-running `/b-work` **self-repairs** a previously-dangling link (e.g. one left pointing at a renamed canonical file) instead of silently skipping it. If the canonical files at `~/dev/being/.config/` don't exist, you get a loud `⚠️` at setup time rather than a silent dangling link — the app would otherwise start with undefined env vars (and break the iOS Metro build, per CLAUDE.md "Known Gotchas").

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

## Phase 3: Safety Scan, Flag Decision, Test Strategy & Implement

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

**If no signals match**: proceed to Step 3.2 (Feature-Flag Decision). General UI work and backend changes don't require a *specialist* planning pass, but they still pass through the flag and TDD decisions below.

---

### Step 3.2: Feature-Flag Decision

Decide whether this work item should **ship behind a feature flag**, driven by the
authored story extracted in Step 1.6 (`Name`, `User Story`, `Acceptance Criteria`,
`Technical Notes`, `## Segments & Jobs` if present, `ADDITIONAL_CONTEXT`). Being has a
two-tier flag system (INFRA-199): a runtime PostHog-backed tier and a build-time tier.
Classify into one **lane**:

| Lane | Use when | Mechanism |
|---|---|---|
| **No flag** *(default)* | `DEBUG-*` fixes, `INFRA`/`MAINT`, backend-only, trivial/cosmetic — any story with no net-new user-facing surface | — |
| **Runtime flag** | user-facing `FEAT` whose story wants to ship dark / enable after release / roll out gradually / A-B test / kill-switch | `useFeatureFlag('name')` from `@/core/analytics` + add `'name'` to `PRODUCT_FLAGS` |
| **Build-time flag** | ship-dark that must stay deterministic/offline, or where runtime/network gating — or coupling availability to analytics consent — is unacceptable (safety/structural) | `isFeatureEnabled('name')` + key in the `FeatureFlag` union + env blob |

**Signals to read from the story:**
- **Type** — `FEAT` is the primary candidate; `DEBUG`/`INFRA`/`MAINT` default to No flag.
- **Rollout language** in Name / AC / Technical Notes / ADDITIONAL_CONTEXT: "ship dark",
  "enable after", "gradual", "rollout", "beta", "A/B", "experiment", "kill-switch",
  "behind a flag".
- **New user-facing surface** (a new screen, row, entry point) vs. internal/backend.
- **Effort ≥ M or Risk ≥ 3** (from the work item's dimension scores) → a flag is more
  valuable for de-risking the rollout.
- **`## Segments & Jobs`** (present when created at `--depth design|full`): a feature
  serving a distinct/at-risk segment or a high-uncertainty job is a stronger
  gradual-rollout candidate. Additional context, not a gate.

**Guardrails (non-negotiable — INFRA-199 ruling):**
- Safety-critical *availability* → **build-time tier only**, never a runtime/network
  flag. Runtime flags are exactly the `PRODUCT_FLAGS` allow-list; anything
  safety/structural stays build-time (mirrors the SAFETY carve-out).
- A flag gating a data feature must **never substitute for the data-operation consent
  gate** (`useConsentStore.canPerformOperation(...)`). The flag governs UI visibility only.
- Runtime (PostHog) flags couple availability to analytics consent; for a *core* feature
  that can't be consent-gated, prefer the build-time tier (or plan a build-time-default
  flip for full rollout).
- Flags are debt. Default to **No flag** unless the story earns one. No flag-for-flag's-sake.

**If Runtime flag — execution:**
1. Gate call sites with `useFeatureFlag('flag_name')` (UI visibility only).
2. Add `'flag_name'` to `PRODUCT_FLAGS` in `app/src/core/analytics/useFeatureFlag.ts`.
3. Add the fail-safe floor `flag_name:false` to `EXPO_PUBLIC_FEATURE_FLAGS` in both
   `~/dev/being/.config/.env.production` and `.env.development`.
4. Tests (Step 3.4) cover flag-on **and** flag-off paths; for data-gated features, assert
   the consent gate still holds independently.
5. **Create the flag in PostHog via MCP — best-effort, ships dark:**
   - Discover before calling (mandatory MCP protocol): `posthog:exec "search feature-flag"`
     → `posthog:exec "info feature-flag-create"` / `info feature-flag-get-all` BEFORE any
     `call`. Never guess the schema.
   - **Verify the active project is the app's EU PostHog project** (the one
     `EXPO_PUBLIC_POSTHOG_HOST` + key target) before creating — switch via the
     project-switch tool if it doesn't match. A flag created in the wrong project silently
     never resolves.
   - **Idempotent**: look the key up via `feature-flag-get-all` first; if it exists, skip
     creation and report "already existed."
   - **Create disabled / 0% rollout**, boolean, key `flag_name`, description citing the
     work item ID. No release conditions referencing wellness-derived properties (DPIA
     boundary; a plain 0% boolean satisfies this).
   - **Never auto-enable or ramp** — enabling and raising rollout % is always a deliberate
     human ops decision, never automated here.
   - **Graceful fallback**: if the PostHog MCP is unavailable (e.g. a headless/cron run
     where the server isn't authenticated) or the call fails, do NOT block the work — emit
     a ⚠️ and leave the manual note ("create the flag in the PostHog dashboard at 0% before
     enabling").

**If Build-time flag — execution:** consume via `isFeatureEnabled('flag_name')`; add the
key to the `FeatureFlag` union and the env blob; ships dark via env default `false`.

**Emit the decision:**

```
🚩 Feature-Flag Decision
   Lane:         [No flag | Runtime (useFeatureFlag) | Build-time (isFeatureEnabled)]
   Rationale:    [why this lane; cite the story signals that drove it]
   If flagged:   name `flag_name` · tier · build-time default false
   PostHog flag: [created at 0% via MCP | already existed | deferred — manual at 0%]   (Runtime lane only)
```

The chosen lane feeds the test strategy below: if a flag was added, the Step 3.4 tests
must exercise both flag states.

---

### Step 3.3: Pass 1 — TDD Decision

Classify the work into one **lane** using the global testing policy
(`~/.claude/CLAUDE.md` → Testing) and the work item's Type + nature. This is a
fast decision step; its output sets the execution order for everything below.

| Lane | Use when (global policy) | Typical signals in a Being work item |
|---|---|---|
| **Test-first (TDD)** | bug fixes, pure logic, stateful algorithms, complex edge cases | `DEBUG-*`; PHQ-9/GAD-7 scoring or thresholds; crisis detection; Zustand reducers; streak/date math |
| **Test-after** | API integrations, UI, glue code, exploratory | `FEAT-*` screens, component wiring, Supabase/Stripe/Sentry integration |
| **Skip** | one-off scripts, spikes, throwaway prototypes | `INFRA`/`MAINT` tooling/config with no runtime logic |

**Hard overrides (non-negotiable):**
- Any change to **clinical/safety logic** — PHQ-9/GAD-7 scoring, thresholds, Q9
  handling, crisis detection — is **Test-first regardless of Type**. Zero false
  negatives (CLAUDE.md → Safety Facts).
- **Skip is forbidden** for any Protected Path (CLAUDE.md table) or any work type
  with a non-`—` cell in the Validation Matrix. If safety signals matched in
  Step 3.1, Skip is off the table.

**Emit the decision (and the fork):**

```
🧪 Test Strategy — Pass 1
   Work type:  [TYPE] — [one-line nature]
   Lane:       [Test-first (TDD) | Test-after | Skip]
   Rationale:  [why this lane; cite override if applied]
   Order:      [3.3 → 3.4 → 3.5 | 3.3 → 3.5 → 3.4 | 3.3 → 3.5]
```

**Execution order by lane** — follow this, do not blindly read top-to-bottom:

| Lane | Order | Loop |
|---|---|---|
| **Test-first** | 3.3 → **3.4 (write failing tests)** → 3.5 (implement to green) | red → green → refactor |
| **Test-after** | 3.3 → 3.5 (implement) → **3.4 (write tests, confirm green)** | implement-then-verify |
| **Skip** | 3.3 → 3.5 only | record skip rationale in Step 5.2; no 3.4 |

---

### Step 3.4: Pass 2 — Identify & Write Tests

> Skip this step entirely only if Pass 1 returned **Skip**. For **Test-after**,
> you reach this step *after* Step 3.5.

**3.4a — Identify (what tests).** Translate the Validation Matrix (CLAUDE.md) row
for this work type into concrete jest targets. This covers the *jest-side* suite
only — Maestro safety e2e stays owned by Step 3.1's advisory and the `/b-close`
Phase 2.5 gate; do not re-author Maestro flows here.

| Validation Matrix validator | Concrete jest command(s) | Notes |
|---|---|---|
| crisis (thresholds) | `npm run test:clinical`, `npm run test:crisis-detection` | boundary cases mandatory |
| accessibility | `npm run test:accessibility` | every UI change |
| compliance (wellness data) | targeted unit/integration on the export/consent path | "wellness data" terminology |
| general logic / backend | `npm run test:unit`, `npm run test:integration` | co-locate with consumer |

- **Bug fixes (`DEBUG-*`)**: before writing the regression test, **root-cause the
  bug with the `/rca` skill** (recommended; skip only for self-evident one-liners
  where the cause is obvious — a typo, an off-by-one with a clear origin). `/rca`'s
  REPRODUCE phase produces the observed failure that *becomes* the regression test,
  and its VERIFY phase is satisfied when that test goes green. Carry the work item's
  story context (User Story, Technical Notes from `/b-create`) into `/rca` INTAKE so
  the diagnosis starts informed. 3.4a's first deliverable is then a **regression test
  that reproduces the bug** (must fail before the fix exists).
- **Boundary obligations** for clinical work: test at the threshold edges —
  PHQ-9 14/15 and 19/20, GAD-7 14/15, Q9 `=0` vs `>0` — not just a happy path.

**3.4b — Write (author the tests).**
- **Test-first lane:** write the 3.4a tests now as **failing specs (red)**.
  Co-locate per repo convention; clinical/safety specs must land in the suites
  wired into `test:clinical` / `test:crisis-detection`. Then drive the
  red → green → refactor loop via the **`/tdd` skill** through Step 3.5.
- **Test-after lane:** author the 3.4a tests against the now-built code and run
  them to **green**.
- **Quality bar (both lanes):** assert behavior and edge cases, not implementation
  detail. End with the relevant `npm run test:*` command(s) passing — paste the
  actual result line into the Step 5.2 Notion comment.

---

### Step 3.5: Implement

> Ordering follows Pass 1: **Test-first** arrives here with failing specs already
> written (implement to green, then refactor); **Test-after** runs this step
> first, then returns to Step 3.4.

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
      "content": "Ready for testing via /b-work\n\nAgents invoked: [List or 'none']\nFeature flag: [No flag | Runtime: <name> | Build-time: <name>] — [rationale]; [Runtime lane: PostHog flag created at 0% via MCP | already existed | deferred to manual]\nTest lane: [Test-first | Test-after | Skip] — [rationale]\nTests written: [files/commands, or 'none — skip rationale']\nTest result: [paste passing npm run test:* line]\n\nImplementation: [Brief summary]\nDeliverables: [List]\n\nNext: Test and run /b-close [WORK_ITEM_ID] when complete"
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

## Phase 6: Skill Retrospective (conditional — most runs skip this)

Fires **only** on one of two triggers:

- **A durable process correction**: the user corrected how this skill operates, a
  documented step here was wrong or missing, or friction hit that would recur on
  unrelated future runs (e.g. the Notion-search pitfall in Step 1.2 — that caveat is
  exactly the kind of lesson this phase exists to capture).
- **An observed improvement opportunity** (stricter bar, max ONE per run): nothing
  broke, but something in *this* run would have gone measurably smoother with a
  procedure change — and you can cite the concrete moment where it would have helped.
  No observed moment this run → not a suggestion, regardless of how good the idea seems.

**Not a lesson — skip silently, say nothing:**
- Facts about the work item itself (its bug, its feature, its root cause)
- One-off environment hiccups that self-resolved
- Anything already covered by this file or `.claude/CLAUDE.md`
- Speculative flexibility: new flags, phases, or generalizations with no observed
  trigger this run

**If a lesson qualifies:**
1. **Route it** to the right file:
   - Skill *procedure* (Notion search, worktree setup, test-lane selection, phase order)
     → this file (`/Users/max/dev/being/.claude/commands/b-work.md`)
   - *Project* fact (build, env, native, dependency gotcha) → propose an entry for
     `.claude/CLAUDE.md` → Known Gotchas instead
   - Lesson about closing/merging → flag it for `/b-close`, don't record it here
2. **Draft the smallest edit.** Prefer amending or tightening existing text over
   appending. This file is large and loads every run — if appending, note what could be
   pruned to pay for it.
3. **Present as a diff** with one line of justification: the lesson, and which future
   runs it helps.
4. **Never auto-apply.** On approval, make the edit. On decline, drop it — do not
   re-propose the same lesson on later runs.

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
