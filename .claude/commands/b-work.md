# Being Work Item Executor [META-COMMAND]

**ARGUMENTS**: $ARGUMENTS

**Format**: `[Work Item ID] - [Additional context]` — or **no arguments**, which auto-selects
the top item of the attended queue (Step 0.2)

**Always print all three decision blocks** — 🚩 Feature-Flag (3.2), 📊 Analytics (3.2a),
🧪 Test Strategy (3.3) — including when every answer is the default (No flag / No event /
Skip). They leave no artifact behind, so an unprinted decision is indistinguishable from an
unmade one, and the defaults are exactly the runs where they get silently dropped.

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

### Step 0.2: Auto-select (only when `$ARGUMENTS` is empty)

A bare `/b-work` runs the top of the **attended queue** — the one pool `/b-batch` structurally
cannot execute. `Batch Route: Attended-only` is the only one of its six values meaning
*`/b-work` could produce a diff*; the other five are out of reach for this skill too (another
repo, `.claude/`-only, no diff at all, blocked, waiting on a release).

1. Read `view://3b7a1108-c208-8055-bc9b-000cfccdb28e` via `notion-query-data-sources`
   `mode: "view"`. **Never SQL** — `Priority` is in `notAvailableInQuerySql`, and SQL mode is
   metered on this workspace.
2. **Assert the filter, fail closed.** If any row's `Status` ∉ {`Not started`, `Blocked`,
   `Batched`}, STOP: the view's Status filter is gone, and Priority-sorted-unfiltered puts
   `Done` rows on top. Same assertion as `/b-batch` Step 0.1a.1 — the filter is hand-maintained
   and this API silently drops `status` filter leaves, so it cannot be repaired from here.
3. Pool = `Batch Route` is `Attended-only` **and** `Status` is `Not started`. **Rank is row
   order**; `Priority` returns an opaque `formulaResult://` handle — never parse or compare it.
   Rebuild each ID as `{Type}-{userDefined:ID}`.
4. Drop any whose branch already has an open PR (`gh pr list --head <branch>`). A plain
   `/b-work` session leaves no manifest, so the PR is the only evidence it exists.
5. **Empty pool → stop and say so. Never widen the criteria** — falling back to unstamped items
   makes a bare `/b-work` a worse `/b-batch`, and can pull an item out from under a slate about
   to be batched.
6. **Propose, never auto-run.** Offer the pick via `AskUserQuestion` with a one-line reason and
   the next two alternates. On accept, set WORK_ITEM_ID and continue to Phase 1 as though it had
   been typed; ADDITIONAL_CONTEXT stays null.

Set `ATTENDED = true` for Phase 5. **Step 1.3's comment read is what validates the stamp** —
`Batch Route` is a cached verdict, and a rescope retiring the device requirement lands in
comments. Selecting on a stale stamp sends a human to do work that no longer exists, which is
the one place this property can do harm; if the body no longer demands human observation, say so
and stop rather than proceeding on the stamp.

---

### Step 0.3: Read the detached-close mailbox (INFRA-492)

A detached close reports through a run directory, not a terminal. Read it before starting
new work, in every run including a bare `/b-work`:

```bash
# Capability-gated: `.claude/` is shared by every worktree the instant it lands on _bare,
# but app/scripts/ arrives only on branches that have back-merged development. Without
# this guard every session errors on a missing script until INFRA-492 reaches development.
DEV_APP=/Users/max/dev/being/development/app
if node -e "process.exit(require('$DEV_APP/package.json').scripts['close:status']?0:1)" 2>/dev/null; then
  (cd "$DEV_APP" && npm run --silent close:status)
else
  echo "ℹ️  development predates INFRA-492 — no detached closes are possible yet."
fi
```

Non-zero means a named failure verdict or a run presumed dead. Surface each line and stop
to handle it; a result nobody looked at is the silence detaching was meant to remove. Do
not `touch <dir>/ACK` for anything you have not acted on.

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

### Step 1.2: Look Up Work Item (exact, one call)

The unique key is `userDefined:ID` — "Work Item ID" is a display formula `Type-ID`, so
MAINT-168 → `userDefined:ID = 168`. Query the data source directly in **SQL mode**:

```
mcp__notion__notion-query-data-sources
data: {
  "mode": "sql",
  "data_source_urls": ["collection://${NOTION_WORK_DB}"],
  "query": "SELECT * FROM \"collection://${NOTION_WORK_DB}\" WHERE \"userDefined:ID\" = [ID_NUMBER]"
}
```

Returns every property directly (Type, Status, Name, Blocked by, dimension scores) — no
candidate scan, no fetch loop. Confirm `Type` equals the parsed TYPE before proceeding: the
ID counter is shared across FEAT/MAINT/INFRA/DEBUG, so `292` is unique on its own, but a
caller asking for "MAINT-292" when 292 is a FEAT must not silently get the FEAT.

Batch related items — blockers, siblings, anything named in Technical Notes — in the same
call rather than one lookup each:
```
... WHERE "userDefined:ID" IN (286, 291, 300, 301)
```

**Fallback**, only if SQL mode is unavailable (single-data-source SQL has an hourly rate
limit on Free/Plus plans): semantic search, which is recency-weighted and cannot reliably
distinguish "MAINT-168" from "MAINT-200" — the right row is often *not* the top hit and cold
or Done items can miss the first page entirely. Never trust rank or the highlight snippet;
`notion-fetch` candidates and match by **property**, and never conclude "not found" from the
top result alone.
```
mcp__notion__notion-search
query: "Work Item ID: [WORK_ITEM_ID]"
data_source_url: "collection://${NOTION_WORK_DB}"
page_size: 25
max_highlight_length: 0
```
If that also fails, STOP and ask rather than churning more searches:
> "Couldn't resolve [WORK_ITEM_ID]. Paste the Notion page link and I'll fetch it directly."

Then `notion-fetch` the pasted URL and confirm `userDefined:ID` equals ID_NUMBER.

---

### Step 1.3: Retrieve Full Page Details

The Step 1.2 query returns *properties* only. The authored story — User Story, Acceptance
Criteria, Technical Notes, AGENTS REQUIRED — lives in the page **body**, so fetch it:

```
mcp__notion__notion-fetch
id: [page id from Step 1.2]
```

Returns page properties and content in Notion-flavored Markdown.

**Then fetch the comments — this is not optional.** The body is the *authored* story; comments
are the *current* state. `/b-close`, `/b-batch`, and founder decisions all record to comments,
so a body section can be stale the moment a comment supersedes it.

```
mcp__notion__notion-get-comments
page_id: [page id from Step 1.2]
include_all_blocks: true
```

**A comment over ~4,000 RENDERED characters is truncated mid-sentence with no marker**
(measured; per comment, and `**`/backticks/`<br><br>` all count toward it). The cut ends in an
ellipsis and reads as prose, so a re-scope can be silently half-read. Treat any comment ending
mid-clause as truncated and ask for the rest rather than planning on what arrived.

Read newest-last and let comments **override** the body on any conflict. Specifically:
- **A long comment can arrive truncated, silently** — it just stops mid-sentence. Retrying
  with `discussion_id` or the comment's `?d=` URL returns the same cut, so don't burn calls.
  `/b-batch` panel comments are long and are exactly the ones that override the body. If the
  tail doesn't end cleanly, say so and name the decision resting on the unread part.
- A body section labelled BLOCKED / HARD BLOCKER is only blocking if **no later comment
  resolves it**. Cross-check against the `Status` property: a body reading "blocked" while
  `Status` is `Not started` / `Batched` / `In progress` means the blocker was lifted — the
  property is the tell, and the resolving comment is the record.
- Prerequisite items opened by a prior planning pass are often named **only** in a comment.
- Never ask the user to re-decide something a comment already records. If a decision looks
  open, confirm it is absent from the comments before raising it.

**If a `Blocked by` item is now `Done`, read its commit before planning.** Status tells you the
gate opened; the commit tells you what came through it. A blocker that removed code often
invalidates the premise of the item it unblocked — MAINT-252's Technical Notes said "keep only
the methods consumed by `useAssessmentPerformance.ts`" when blocker MAINT-398 had *deleted* that
file, turning a per-method trim into a whole-directory deletion, and the blocker's own commit
message named the correct replacement scope. Resolve with
`git log --oneline --all --grep="<BLOCKER-ID>"` then `git show --stat <sha>`, and treat any
conflict with the body the same way you treat a comment: the landed code wins.

**Read a Done blocker's comments, not just its commit.** A blocker can close against a
deliberately NARROWED scope with the remainder refiled as new items, and that narrowing is
recorded in its comments, never in its diff. If the mechanism your item was waiting on was
the deferred half, your premise is unsettled and the item that inherited it is the real blocker.

**A blocker with no `Blocked by` relation needs the same check — keyed on files, not items.**
The rule above fires on the item graph, so it misses the commoner shape: a blocker recorded
only as prose, asserting that some file *does* something. Nothing links that file back to the
item, so the claim rots while `Status` stays `Not started` — and a verified-but-stale blocker
is more dangerous than an unverified one, because the rigour of the original check is what
stops the next reader re-testing it. Re-read every file the blocker names and confirm it still
says what the blocker says; `git log --oneline -5 -- <path>` shows whether it moved.

**A blocker asserting *external* state — a provisioning portal, deployed functions, a
dashboard — cannot be settled by the repo at all.** Re-run the authoritative query
(`eas device:list`, `supabase functions list`); a grep that merely reproduces the
original absence re-confirms the stale reading instead of testing it.

**An AC that demands *observed* evidence is a dependency on whatever records it.** Nothing
links a decision item to the instrument that would settle it, so find that instrument and
confirm it is in service and has collected — a log that exists but holds only its own test
traffic reads as data. If it has not, the decision is not yours to make this run.

---

### Step 1.4: Incorporate Additional Context

**If ADDITIONAL_CONTEXT exists** (from Phase 0):

Display:
```
📝 Additional Context: [ADDITIONAL_CONTEXT]
   This will be considered alongside work item details for planning.
```

Use ADDITIONAL_CONTEXT to inform safety-scan and implementation in subsequent phases.

---

### Step 1.5: Extract Context

Parse from Notion page:
- Type (FEAT, DEBUG, INFRA, MAINT, AGENT)
- Name
- User Story
- Acceptance Criteria
- Technical Notes
- AGENTS REQUIRED (suggested by `/b-create`; may be empty)
- Priority

These feed the safety scan in Phase 3.

**Verify the item's own factual claims the way you verify a blocker's.** ACs routinely
assert that a constant, count or file state does not exist, and those claims age between
authoring and execution. Re-derive each one you are about to act on — a stale premise
usually widens scope or reopens a decision the tree has already settled.

**A claim about what a GATE will do is a claim about the gate's code, not the item's.**
Items and packets assert that touching some path forces an expensive tier — an attended
close, a device run, a rebuild. Read the gate's own filter before accepting it: an
over-stated tier spends a human session on work that closes headless.

**Then ask whether any AC still needs doing.** An item deferred as release-gated or
release-only is satisfied by the next release shipping, so re-derive its ACs against
`origin/main` — not `development` — before Step 1.6 marks it `In progress`. Where they
all hold, close it with the evidence instead, and re-file any constraint its comments
carry that the merge has since made due.

---

### Step 1.6: Mark Work Item as In Progress

Here, not after the worktree — Phase 2 can hand off to a 20-minute cold build, and Step 2.0
skips Phase 2 entirely for items that need no worktree, so marking it there leaves those
items reading `Not started` to every other session for the whole run.

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

## Phase 2: Create Worktree

### Step 2.0: Does this item need a worktree at all?

Skip Phase 2 when the item produces **no commit on a short-lived branch** — verification
/measurement items whose deliverable is a Notion record, and items whose only file lives
in `.claude/` (tracked on `_bare`, gitignored on `development`, so it can never travel in
a feature PR). Confirm with:
    git ls-tree origin/development --name-only .claude/   # empty ⇒ _bare-only
Build/run from the existing `development` worktree instead: a fresh worktree starts with a
COLD DerivedData cache (21m31s for a first Release build), paid for a branch that will
never carry a commit. Skip to Phase 3, and note in Step 5.2 that `/b-close` has no PR to
open.
**Verify that worktree before using it** — `git -C development status --porcelain` and
`branch --show-current`. Shared worktrees routinely sit on another session's branch with a
staged index, so a run there reads the wrong tree or gets swept into someone's commit. Not
clean and on `development` → cut your own scratch worktree instead.

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
→ **Measure drift first**: `git rev-list --count HEAD..origin/development`. Hundreds of commits
  mean the branch is a record, not work in progress — re-check each defect it claims against
  `origin/development`, since siblings routinely fix the same thing and a superseded migration
  collides rather than merges. Reset and re-derive what survives; tag first if unpushed.
→ Otherwise skip to Step 2.4 (cd into existing worktree)
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

**First, a base check — only when the item depends on another item's in-flight branch.**
If the body or comments name a parent item, prerequisite, or slice sequence, verify that
item's commits are actually on `development` before branching:
```bash
git log --oneline origin/development..[their-branch] | head
```
Non-empty output means their work is NOT on development: a `development`-based worktree
will show pre-migration code, and cannot host edits to files only their branch has in
current form. Ask which base to use — don't assume `development`.

**Re-fetch immediately before any expensive verification run.** A worktree created minutes
earlier can already be behind. If the deliverable is a build, gate run, or e2e suite,
`git fetch && git merge origin/development` first — a 20-minute build on a stale base is
discarded work, and the commit you missed may be the one that breaks the run.

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
  cd app && GITHUB_TOKEN=$(grep _authToken ~/.npmrc | head -1 | sed 's/.*_authToken=//') npm ci
fi
```

**`npm ci`, not `npm install`.** Setting a worktree up is not a dependency change — `ci`
installs exactly what the lockfile says and **cannot write it**, where `install` is free to
re-resolve and produce lockfile churn nobody asked for. That churn is invisible in a green
suite and lands in the PR diff; on an item whose scope explicitly forbids touching
dependencies it is a scope violation delivered by the setup step. Use `install` only when the
work item *is* a dependency change.

**Install even when the deliverable needs no app build.** `node_modules` is where husky lives,
so a worktree without it runs no pre-commit hook — the commit succeeds unverified and says
nothing. A migration- or docs-only item is exactly where this looks skippable.

**The `GITHUB_TOKEN=` prefix is required, not defensive.** `app/.npmrc` resolves
`@mp2ez:registry` with `${GITHUB_TOKEN}`, which shadows the PAT in `~/.npmrc` — so a bare
install 401s on `@mp2ez/being-design-system` in a fresh worktree. (The same shadow makes a
bare `npm outdated` report 1 outdated package instead of 55 — a quiet wrong answer, not an
error.) A `gh` token does not substitute; it lacks `read:packages` and 403s.

**If dependencies already exist:**
```
✅ Dependencies already installed
   Skipping install
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
   Please run manually, with the token prefix above:
   cd ~/being/[dir-name]/app && GITHUB_TOKEN=... npm ci
```

**Verify before committing** that `app/package-lock.json` is unchanged (`git diff --stat --
app/package-lock.json`) unless the work item is itself a dependency change.

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

## Phase 3: Safety Scan, Flag & Analytics Decisions, Test Strategy & Implement

### Step 3.1: Safety Scan

Scan the work item's **Name**, **User Story**, **Acceptance Criteria**, **AGENTS REQUIRED**, and **ADDITIONAL_CONTEXT** for the signals below. If matches are found, invoke the corresponding specialist agent for a planning pass *before* writing code. The agent's job is to set non-negotiable constraints; the main agent implements within them.

| Signal | Agent | Examples |
|---|---|---|
| `crisis`, `988`, `PHQ`, `GAD`, `threshold`, `suicide`, `safety plan`, `emergency` | `crisis` | Crisis detection, threshold logic, 988 integration |
| `Stoic`, `Marcus Aurelius`, `Epictetus`, `Seneca`, `virtue`, `dichotomy of control`, `mindfulness`, `breathing`, `prosoche` | `philosopher` | Stoic Mindfulness content, exercises, principles |
| `consent`, `privacy`, `data export`, `encryption`, `wellness data`, `payment`, `CCPA`, `TDPSA`, `GDPR` | `compliance` | Privacy/data flows, consent UI, regulatory questions |

Multiple signals → invoke multiple specialists in parallel.

**When specialists conflict**, send the conflict back to the specialist whose domain owns
the decision, quoting the other's reasoning and any facts it lacked — do not adjudicate
between them yourself, and do not average the two rulings. A specialist that ruled without
a key fact will often amend its own constraint once given it. Record the amended ruling,
not the original.

**A specialist ruling is scoped to the code it read.** If the tree changes under you —
a back-merge, a sibling item landing on `development` — re-check any ruling whose premise
was a line that moved. Where the incumbent code already solves the concern by other means,
keep the incumbent and note why; reverting a just-landed change during a merge resolution
is how a fix becomes a regression.

**A ruling about a third-party package is scoped to what the specialist actually read.**
Docs state intent; the shipped tarball is the artifact. `npm pack <pkg>@<version>` and read
the native source before accepting a recommendation to add or reject a dependency — an API
can exist, be first-party, be on the right pin, and still not do what its own docs imply.

**A finding is not automatically a blocker.** Before making one a prerequisite, ask
whether the change under review *creates* the harm or merely makes an existing gap
visible to a new cohort. Gate on regressions; track activations as follow-ups. Getting
this wrong defers a change that costs nobody anything behind work for a different cohort.

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

**If no signals match**: proceed to Step 3.2 (Feature-Flag Decision). General UI work and backend changes don't require a *specialist* planning pass, but they still pass through the flag, analytics, and TDD decisions below.

---

### Step 3.2: Feature-Flag Decision

Decide whether this work item should **ship behind a feature flag**, driven by the
authored story extracted in Step 1.5 (`Name`, `User Story`, `Acceptance Criteria`,
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

### Step 3.2a: Analytics Instrumentation Decision

Decide whether this work item should **emit a PostHog product event**, reading the same
story fields as Step 3.2 in the same pass. Classify into one **lane**:

| Lane | Use when | Mechanism |
|---|---|---|
| **No event** *(default)* | `DEBUG`/`INFRA`/`MAINT`, backend-only, cosmetic — no net-new user-facing interaction | — |
| **Existing event** | the interaction maps onto a name already in `SAFE_EVENT_TYPES` | call the `useAnalytics()` tracker at the new site |
| **New event** | net-new interaction that no whitelisted name covers | register it (below), then add a tracker |

Most whitelisted events have **no emit site yet** — read `PHIFilter.SAFE_EVENT_TYPES`
before concluding you need a new name.

**Signals to read:**
- **Step 3.2's lane** — a Runtime flag makes an event near-mandatory: a gradual rollout or
  A/B you cannot measure is decorative.
- **Net-new user-facing surface** (screen, entry point, completed action) vs. internal/backend.
- **A half-instrumented funnel** — a `_started` with no `_completed` is worse than neither:
  a denominator with no numerator.

**Guardrails (non-negotiable — INFRA-214 routing):**
- **The sink is a legal-basis partition, not a preference.** PostHog = consented product
  analytics; Supabase = vital-interest crisis telemetry. Crisis *access*
  (`crisis_resources_viewed`, `crisis_hotline_tapped`) is whitelisted for PostHog; crisis
  *detection* never routes there.
- PostHog no-ops without analytics consent — never build a safety or compliance mechanism
  on an event's delivery.
- Any screen name carried in a property goes through `coarsenScreenNameForAnalytics` (DEBUG-239).
- An event carrying data outside the categories disclosed in
  `docs/architecture/analytics-architecture.md` § Privacy Policy Disclosure needs a
  `compliance` pass — it moves the policy and the App Store labels. Within them, no doc change.
- Events are surface area. Default to **No event** unless the story earns one.

**If New event — execution.** Every miss below fails *silently*: `trackEvent` logs the block
and returns, nothing throws.
1. Add the string to `SAFE_EVENT_TYPES` **and** the constant to `AnalyticsEvents` — both in
   `app/src/core/analytics/PHIFilter.ts`.
2. Add a named tracker to `useAnalytics.ts` and export it; call sites use the tracker, never
   a raw string.
3. Properties — `PHIFilter.validate` drops the **whole event** on any violation: numeric
   props must be keys in `SAFE_NUMERIC_KEYS`, and string *values* are substring-scanned
   against `PHI_KEYWORDS`, which includes `name`, `note`, `entry`, `result`, `reflection`
   (so a value like `evening_reflection` kills the event).
4. Update the event list in `docs/architecture/analytics-architecture.md`.

**Emit the decision:**

```
📊 Analytics Decision
   Lane:        [No event | Existing event | New event]
   Rationale:   [why this lane; cite the story signal or the Step 3.2 lane that drove it]
   Event(s):    `event_name` · [already whitelisted | registered in PHIFilter] · props: [...]
```

Any lane but **No event** feeds Step 3.4: the tests must assert the tracker fires at the
intended site **and** that `PHIFilter.validate` returns valid for the real property shape —
an emit test alone proves nothing if the filter then drops the event.

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
- **Test-first lane:** write the 3.4a tests now as **failing specs (red)**, and
  confirm each fails for the reason you intended — a spec that is green before the
  implementation exists is passing on unrelated behaviour, so re-fixture it until
  only the change under test can satisfy it.
  A red that fails EVERY case proves nothing either — it is indistinguishable from a
  harness that never ran. Include cases that must stay GREEN across the change; if
  none of them pass, debug the harness before reading the red.
  When that red is a SUITE-COLLECTION failure because the spec names a symbol
  that does not exist yet, land the structural step alone first — export the
  symbol, rename the field — then re-run: the behaviour specs now fail
  individually against green controls, which is the red worth reading.
  **When the code under test already exists** (a regression pin on landed code —
  there is no implementation to withhold, so the instruction above silently does
  not apply), the red proof is a **mutation run**: break the mechanism the test
  claims to cover, confirm red, revert. One mutation per *mechanism*, not per
  file — a control that conflates two mechanisms stays green while either
  survives, and looks exactly like a working pin.
  Co-locate per repo convention; clinical/safety specs must land in the suites
  wired into `test:clinical` / `test:crisis-detection`. Then drive the
  red → green → refactor loop via the **`/tdd` skill** through Step 3.5.
- **Test-after lane:** author the 3.4a tests against the now-built code and run
  them to **green**.
- **Quality bar (both lanes):** assert behavior and edge cases, not implementation
  detail. End with the relevant `npm run test:*` command(s) passing — paste the
  actual result line into the Step 5.2 Notion comment.
- **"It can't be pinned because X is mocked" must be checked before it is recorded.**
  Only a mock in `jest.config.js` `setupFiles`/`setupFilesAfterEnv` is global; a
  `jest.mock` in other suites does not stop a NEW suite driving the real module.
  Recording the limitation without checking writes a false "unprovable" into the
  close-out, on exactly the ACs that demanded proof.
- **Before blaming your diff for a red test, measure the baseline FAILURE RATE, not
  the baseline outcome.** One green run on the base commit does not exonerate it, and
  a bisect with one sample per arm returns noise. Run the suspect test ~10x on both
  trees. Verify the control's `node_modules` matches its lockfile first — a stale
  worktree is not a control.
- **For an INTERMITTENT defect, a consecutive-pass count is not an acceptance test.**
  At rate p, N passes occur (1-p)^N of the time on unfixed code — at p=0.05, three
  passes ~85%. Measure the mechanism the bug runs through, or a rate against a matched
  control; an AC specifying "N consecutive" needs respecifying before it is judged.

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

**Only if the work item's Acceptance Criteria are fully met.** If this run completed an
*increment* of a larger item (Effort L/XL), or hit a blocker that stops the remaining ACs,
leave Status as `In progress` and say so explicitly in the Step 5.2 comment — including
which ACs are served and which are not. Marking a partial run `Testing` misreports state to
the next reader and invites a `/b-close` on unfinished work.

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
page_id: "[page_id from Phase 1]"
markdown: "Ready for testing via /b-work\n\nAgents invoked: [List or 'none']\nFeature flag: [No flag | Runtime: <name> | Build-time: <name>] — [rationale]; [Runtime lane: PostHog flag created at 0% via MCP | already existed | deferred to manual]\nAnalytics: [No event | Existing: <name> | New: <name>] — [rationale]\nTest lane: [Test-first | Test-after | Skip] — [rationale]\nTests written: [files/commands, or 'none — skip rationale']\nTest result: [paste passing npm run test:* line]\n\nImplementation: [Brief summary]\nDeliverables: [List]\n\nNext: Test and run /b-close [WORK_ITEM_ID] when complete"
```

`page_id` is a TOP-LEVEL parameter and the content field is `markdown`, a single string.
Do not use `parent:` + `rich_text[]` — that shape is rejected, and `rich_text`'s per-object
2000-char cap cannot hold a normal testing comment anyway.

### Step 5.3: Report Testing Status

```
✅ [WORK_ITEM_ID] implementation complete
Notion updated: Status → Testing

⏭️  Next steps:
1. Test the implementation
2. Provide any feedback
3. Run: /b-close [WORK_ITEM_ID]
```

**When `ATTENDED` (Step 0.2), report a hand-off instead.** Step 5.1 will have left the item
`In progress` by its own rule — an attended item's ACs demand human observation, so no headless
run serves them, and this skill's job was to stage the session rather than finish it. Emit the
observation script **extracted from the item's own ACs and Technical Notes, never invented**:
the exact device or simulator geometry, the exact commands, and exactly what to capture. If the
item states no procedure, say so — a confidently wrong device workflow is worse than none.
Re-resolve any `file:line` the item or its comments cite before emitting it. Line references rot,
including inside a comment that corrected an earlier one, and a handoff spends a human's session
on them unverified.

**Drive the capture half first.** On a visual item, `Attended-only` usually means the
RULING is human, not the evidence: screenshots script from an ad-hoc Maestro flow outside
the worktree, and Dynamic Type from `simctl ui <udid> content_size`. Capture, then hand over
images to judge — a clipped label is a finding no eye is needed to detect.

```
🖐️  [WORK_ITEM_ID] staged for an attended session — Status stays In progress
    Worktree: [dir]
    Landed headless: [what this run actually did]

    Run, from that worktree:
      [commands, verbatim from the item]
    Capture: [the evidence the AC names]
    Serves AC: [n]    Still unserved: [n, …]
```

---

## Phase 6: Skill Retrospective (conditional — most runs skip this)

Fires **only** on one of two triggers:

- **A durable process correction**: the user corrected how this skill operates, a
  documented step here was wrong or missing, or friction hit that would recur on
  unrelated future runs. Step 1.2 is the worked example in both directions: it once
  documented a semantic-search workaround, and a later run found that the documented
  premise ("no exact-ID query exists") was simply false and replaced it with the SQL
  lookup. A step that *works* can still be wrong — if you find a better primitive than
  the one written here, that is exactly the lesson this phase exists to capture.
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
2. **Draft the smallest edit. Hard limits, not preferences.** Prefer amending or
   tightening existing text over appending. **~4 lines of prose, ceiling.** State the
   rule and stop: **no worked examples, no incident retellings, no work-item ID cited
   as illustration** — git already holds the story, and a rule that needs a case study
   to be understood is not yet a rule. These files load every run and grow one
   "small" addition at a time, so if appending, name what could be pruned to pay for it.
   An example that *defines a trigger* rather than illustrating a rule is load-bearing —
   don't count it as prunable.
3. **Present as a diff** with one line of justification: the lesson, and which future
   runs it helps.
4. **Never auto-apply, and apply EXACTLY the approved text.** On approval, make that
   edit verbatim — "make it concise" means trim what was shown, never rewrite or add.
   On decline, drop it — do not re-propose the same lesson on later runs.

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
