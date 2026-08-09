# Batch Work Executor [META-COMMAND]

**ARGUMENTS**: $ARGUMENTS

**Format**: `ID1, ID2, ID3, …` (comma- or space-separated work item IDs) — or `--resume` —
or **no arguments**, which auto-selects a slate from the backlog (Step 0.1a)

Orchestrates a sequence of work items through plan → approve → implement → test →
close, with as few human prompts as possible. Wraps `/b-work` and `/b-close` — it
does **not** reimplement them, and requires **no changes** to either skill (it uses
their existing argument and status seams). Reads like your manual loop (plan in plan
mode, approve, auto-run, test, close, next), but batches the human decisions up front
and walks the list itself.

---

## Run-mode prerequisite (read first)

**Run `/b-batch` in Accept-Edits mode, NOT plan mode.** This skill *is* the
plan-and-approve mechanism: Stage 1 plans, Stage 2 gets your approval via a single
batched prompt, Stage 3 executes. Launching it inside plan mode would block Stage 3's
edits behind a separate plan approval and defeat the batching. If the session is in
plan mode, say so and stop — ask the user to switch (Shift+Tab) and re-invoke.

**Guardrails inherited from CLAUDE.md (non-negotiable, the loop hits the same walls you would):**
- Never `--no-verify` (commit/push) and never `--skip-e2e` on `feat/*`/`fix/*`/`chore/*`. Hotfix-only, and this skill never creates hotfixes.
- Never make CI green by deleting/weakening a failing assertion. Fixes must re-run the suite locally to green first.
- A safety-surface change never merges without the Maestro gate having RUN AND PASSED — that much is inherited (`/b-close` Phase 2.5; `--skip-e2e` hotfix-only). Who *watches* it is this skill's own policy, not CLAUDE.md's: the gate is mechanical and `/b-close` owns it end to end, so this loop may let it run. A human approves the merge only for `features/crisis/` / `features/assessment/` changes and for an added/edited `.maestro/` flow; other safety paths close mechanically on green.

---

## Phase 0: Parse & Mode

> **Concurrent runs are supported.** Multiple `/b-batch` sessions can run at once
> (separate Claude chats), provided their item lists are **disjoint** — each batch owns
> its own manifest (per-batch slug, Step 0.1b), refuses IDs already live in a sibling
> batch (Step 0.1c), and self-recovers from the `origin/development` merge race
> (Phase 3.4). The one resource that is *not* parallelizable is the **human-attended
> simulator close** (Phase 4.1) — but a single human serializes that naturally, so no
> lock is needed. **Do not** run two simultaneous batches that each carry a Supabase
> DB-migration item (one shared live DB).

### Step 0.0: Reap orphaned `Batched` claims (runs on BOTH fresh and `--resume`)

Notion `Status: Batched` is a **projection** of manifest state, never a source of truth —
the same rule Step 0.1c states for in-flight IDs. A batch that dies (crashed session,
`/clear` with no resume, abandoned run) leaves its claims behind, and a status column that
is confidently wrong is worse than the silence it replaced. So reconcile before anything
else. This needs only the manifest glob, not the batch slug, which is why it runs ahead of
the resume/fresh split and covers both paths with no cross-reference.

Collect every ID any live manifest still owns — same predicate as Step 0.1c, `state ∉
{done, deferred}` — then query Notion for `Status = 'Batched'`. Any ID **not** in the owned
set is an orphan: set it back to `Not started` and report it. Never touch an owned one.

    ⚠️  Reaped 2 orphaned Batched claims → Not started: MAINT-304, INFRA-379

Manifests are never deleted, so a finished batch's file still answers for its items. The
predicate is *owned by a live manifest entry*, not *some manifest exists*.

### Step 0.1: Resume vs. fresh
- If `$ARGUMENTS` contains `--resume` → go to **Phase 5 (Resume)** (it handles both
  `--resume` alone and `--resume <IDs>`).
- Otherwise parse the remaining text into an ordered list of WORK_ITEM_IDs (split on commas and/or whitespace; uppercase; validate each against `TYPE-NUMBER` where TYPE ∈ {FEAT, DEBUG, INFRA, MAINT, AGENT}). Drop and report any malformed token.
- If the resulting list is empty **because no arguments were given** → **Step 0.1a** (auto-select). If it is empty because every token was malformed, abort and say which.

### Step 0.1a: Auto-select the batch (no-args invocation)

Produces an ordered ID list and nothing else — no manifest, no Notion write, no worktree —
then hands it to Step 0.1b as if you had typed it. Read-only-until-approved is what makes a
fumbled bare `/b-batch` harmless: it costs a few fetches and shows a slate you can decline.

It must run **here**, between the parse and the slug: Step 0.1b derives the slug from the
final ID list, so selection cannot happen after it.

**Source — the `b-batch intake` view**, `view://3b7a1108-c208-81cb-895f-000c23835d40`: a
table on `${NOTION_WORK_DB}` sorted `Priority` DESC, filtered to `Not started` + `Blocked`.
Read it via `notion-query-data-sources` with `mode: "view"`. To recreate it, that filter and
sort plus `SHOW "Name", "Work Item ID", "Status", "Type", "Effort", "Priority", "Blocked by"`.

**Use the view, never SQL.** SQL mode is metered on this workspace and exhausts after a few
calls; view mode is unmetered. SQL also cannot select `Priority` at all — it is in the data
source's `notAvailableInQuerySql` — so ranking there means recomputing
`(I × V^1.5 × SF × U) / (E × R)` and trusting the reconstruction. The view applies the real formula.

Two read constraints that hold in **every** path, including this one:
- **Rank is row ORDER, not a value.** `Priority` returns an opaque `formulaResult://…`
  handle. Never parse it or compare two rows by it; position in the result *is* the ranking.
- **Rebuild the ID as `{Type}-{userDefined:ID}`** (`DEBUG` + `189` → `DEBUG-189`). The
  `Work Item ID` property is itself a formula and returns a handle too.

#### 0.1a.1 — Verify the view's filter, fail closed
The filter is **hand-maintained and cannot be repaired from here**: this API drops filter
leaves on `status`-type properties, writing the surrounding AND/OR group and silently
discarding the condition — the same gap that prevents creating status options. Assert it,
don't assume it.

If **any** row comes back with `Status` ∉ {`Not started`, `Blocked`}, the filter is missing or
was edited — **STOP**. Do not filter client-side instead: sorted by `Priority` with no filter,
the top of this backlog is `Done` items, so the failure is silent and proposes finished work.

    ⛔ `b-batch intake` returned a `Done` row — its Status filter is missing.
       Restore in Notion: Filter → Status → is any of → Not started, Blocked.

#### 0.1a.2 — Partition
`Not started` → **candidate pool**, already in priority order. `Blocked` → **hygiene scan
only**, never a candidate (Step 2.2 would defer it anyway).

#### 0.1a.3 — Hygiene report (mechanical, no judgement)
A `Blocked` row whose `Blocked by` relation is **empty** is a structural anomaly: the database
has a relation for exactly this and it is unset, so the blocker exists only as prose. Report
count and IDs. Do **not** read those bodies and do not adjudicate whether the blocker still
holds — that is the in-context judgement Step 2.1 exists to avoid, and it would re-run every
invocation instead of driving a one-time fix.

    📌 N items are Blocked with no recorded blocker (relation unset): …
       Triage once — a prose blocker contributes no edge to the Step 2.2 graph.

#### 0.1a.4 — Exclude, and name every exclusion
Drop from the pool, reporting each class. **Never silently** — a hidden cap reads as
"considered everything":
- **Owned elsewhere** — the ID is in a live `.b-batch-state.*.json` with `state ∉ {done,
  deferred}`, or `gh pr list` shows an open PR on its branch. A plain `/b-work` + `/b-close`
  session has no manifest, so the PR is the only evidence it exists.
- **Unlanded prerequisites** — `Blocked by` non-empty with any target not `Done`.
- **Too large to batch** — `Effort` `XL` / `XXL`. One `/b-work` in one worktree cannot carry
  5–8+ weeks; these need slicing via `/b-create` first. Naming them makes the omission a
  recommendation rather than a silence.

If the pool empties, report why and stop — never widen the criteria to fill a slate.

#### 0.1a.5 — Read bodies for the top ~10 only
`notion-fetch` the top ~10 survivors, not the whole pool. Everything below this point needs
the AC and technical notes; nothing needs them for a row that will never be proposed.

#### 0.1a.6 — Shape the slate
Fill **in view order**, subject to all three:
- **Effort budget** — Step 2.4's 12 points / 6 items, same scale. Selecting past it only
  manufactures `pending` items.
- **RED quota — at most 2.** Classify from the fetched body against Step 2.1's path set, never
  from the title: titles do not predict safety surface, and an infra or script item can read
  alarming while touching nothing gated. Each RED costs a *serial, human-attended* simulator
  close (Phase 4.1), so four REDs is a bad slate at any priority.
- **Coherence bonus** — prefer candidates forming a `Blocked by` / `Blocking` chain **inside
  the pool**. Phase 2.2 already sorts those into tranches, making A-then-B in one run the
  cheapest batch available. Weaker tie-break: shared `Type` and overlapping subject matter,
  which tend to share files and merge cheaply.

#### 0.1a.7 — Propose, never auto-run
Present the slate via `AskUserQuestion`: the picks, the point total, the RED count, and a
one-line reason each (rank / chain / cheap). Offer at least accept, edit-the-slate, and fall
back to typing IDs. The approved list continues at Step 0.1b as though typed.

### Step 0.1b: Compute the batch slug (per-batch manifest key)
The manifest path is **per-batch**, keyed by a slug derived **deterministically from the
sorted item list** — so a later `--resume <same IDs>` recomputes the same slug and finds
the same file with nothing to remember. Compute it from the validated IDs:
```bash
# Sorted, lowercased, internal hyphen stripped, joined by '-':
#   FEAT-130, MAINT-191, DEBUG-44  →  debug44-feat130-maint191
SLUG=$(printf '%s\n' "${IDS[@]}" | tr 'A-Z' 'a-z' | tr -d '-' | sort | paste -sd- -)
# Keep filenames sane: if >50 chars, use first two IDs + an 8-char hash of the full slug.
if [ "${#SLUG}" -gt 50 ]; then
  HASH=$(printf '%s' "$SLUG" | shasum | cut -c1-8)
  SLUG=$(printf '%s\n' "${IDS[@]}" | tr 'A-Z' 'a-z' | tr -d '-' | sort | head -2 | paste -sd- -)-$HASH
fi
MANIFEST="/Users/max/dev/being/.config/.b-batch-state.$SLUG.json"
```
Use `$MANIFEST` everywhere the manifest is read/written (Phase 2.5, Phase 3, Phase 5).

### Step 0.1c: Overlap guard (refuse IDs already live in a sibling batch)
Concurrent batches must be disjoint. Glob sibling manifests and collect every `id` whose
`state ∉ {done, deferred}` (those are in-flight elsewhere):
```bash
for f in /Users/max/dev/being/.config/.b-batch-state.*.json; do
  [ "$f" = "$MANIFEST" ] && continue
  [ -e "$f" ] || continue
  # emit "<id> <slug-of-f>" for each in-flight item
done
```
If any **incoming** ID matches an in-flight ID in another batch, **drop that ID** from
this batch and report it, naming the owning batch slug:
```
⛔ FEAT-130 is already in-flight in batch `debug44-feat130-maint191` — dropped from this batch.
   Co-locate overlapping work in one batch, or wait for the other to finish.
```
**No worktree or PR is NOT evidence a sibling batch is dead.** A sibling that has planned
but not yet reached Step 3.1 looks identical to an abandoned one. Manifest `state` is the
only authority. To override, mark the entry `deferred` in that manifest first — never
proceed silently.

Abort only if dropping leaves the list empty. (This makes the disjoint-list rule a guard,
not just discipline — it closes the Notion-status race on shared items.)

### Step 0.2: Claim the list, then confirm it

**Write the stub manifest here, not at Phase 2.5.** Step 0.1c's overlap guard reads sibling
manifests — but the manifest did not exist until after the planning sweep, so two batches
launched inside that multi-minute window both passed the guard and both claimed the same
IDs. Claiming at the moment ownership is taken is what makes the guard real. Write `$MANIFEST`
now with the parsed IDs and `state: "claiming"` (the shape is Phase 2.5's; the fields that
phase adds are simply absent yet). `claiming` counts as in-flight for Step 0.1c and Step 0.0.

The stub is the half that closes the guard window, and it is local and instant. The Notion
half needs a resolved page, so it lands in **Phase 1** at the fetch that resolves it — a few
seconds later, and it skips IDs that never resolve at all rather than trying to claim them.

**Claim only from `Not started`, and revert only to `Not started`.** Leave every other status
exactly as found. `Blocked`, `In progress`, and `Testing` already read as spoken-for, so they
were never part of the visibility problem, and the restriction means no prior status ever has
to be remembered in order to be restored. It matters in one non-obvious place: Phase 5 step 3
revives a `Blocked` item when its prerequisite lands and re-applies the cap, so a revived item
can sit `pending` — leave it `Blocked` rather than inventing a reversion target for it.

**Releasing the claim.** Most exits already write a status and need nothing new — the one
that does not is a plain `deferred`, which is precisely the case that would strand a claim:

| Exit | Leaves `Batched` via | New write? |
|---|---|---|
| `/b-work` runs it | its Step 2.7 → `In progress` | no |
| cascade-blocked / parked (Steps 2.2.4, 3.1, 3.4) | explicit → `Blocked` | no |
| closed (Step 3.3) | `/b-close` → `Done` | no |
| `pending` behind the Step 2.4 cap | stays `Batched` — **the point of the status** | no |
| dropped as `Cancelled` on resume | Notion already says so | no |
| **`deferred`** (amber unresolved, `unresolved-id`, cross-batch dep) | — | **yes → `Not started`** |
| batch abandoned | — | Step 0.0 reaper |

Echo the parsed list back so the user sees what will run (the Notion claims are reported by
Phase 1 as each page resolves, not here):
```
📋 Batch queue (N items): FEAT-130, MAINT-191, DEBUG-44, …
   Batch slug: debug44-feat130-maint191
   Manifest claimed: 3 items → state "claiming"
   Mode: Accept-Edits ✓
```

---

## Phase 1: Parallel Planning Sweep (no human)

For **each** work item, in parallel across items, run a *diverse* planning panel via
the Agent tool. Diversity is the point — three clones of one agent agree by
construction and give false confidence. The panel must be able to actually disagree:

| Lens | Agent | Job |
|---|---|---|
| Architecture | `Plan` | Produce the implementation approach + the files it expects to touch. |
| Constraint | Validation-Matrix specialist (`crisis` / `compliance` / `philosopher`) — only if the item's story text matches that domain | Set non-negotiable constraints; flag safety/compliance blockers. |
| Skeptic | `general-purpose` (or `Explore`) | **Manufacture an ambiguity.** Explicitly prompted to find a reason the acceptance criteria are under-specified or could be misread. If it can't, the story is genuinely clear. |

**Panel scaling (cost control):** `MAINT-*` / `INFRA-*` with no domain match → 2 lenses
(Architecture + Skeptic). `FEAT-*` / `DEBUG-*` or any domain match → 3 lenses.

First fetch each item's Notion page (reuse `/b-work` Phase 1 logic: search
`Work Item ID: <ID>` in `collection://${NOTION_WORK_DB}` with `page_size: 25`, then verify
`Type` + `userDefined:ID` **by property, not rank** — semantic search has no exact-ID match
and the right row is often not the top hit) so the panel plans against the real story, AC,
and technical notes.

**Claim the page as you resolve it (Step 0.2's Notion half).** The fetch returns `Status`
directly, so the moment a page resolves: if its `Status` is `Not started`, set
`Status: Batched`; otherwise leave it untouched. Also record its `Effort` on the manifest
item — Step 2.4 budgets on it. Doing this here rather than at Step 0.2 costs no extra fetch
and never claims an ID that turns out not to resolve. Report the result once, after the
sweep:

    🔖 Claimed in Notion (→ Batched): FEAT-130, MAINT-191
       Left as-is: DEBUG-44 (In progress)

**Unattended-miss rule:** if an ID still won't resolve after b-work's
one recency-biased retry, do **not** stop to ask for a link (no human in this loop) — record
the item in the manifest as `deferred` (reason: `unresolved-id`) and surface it in the
end-of-run summary for manual lookup. Never guess a page or proceed on the wrong one.

**Each panel agent returns a structured verdict** (force via schema):
```
{ approach: string,
  confidence: "high" | "medium" | "low",
  blocking_constraints: string[],
  ambiguities: string[],
  files_touched: string[],     // best-effort prediction
  declared_deps: string[] }    // supplementary body-text prerequisites (see below)
```

**Dependencies are structured, not free text.** The `Being. Product Backlog` data
source has two reciprocal **relation** properties:
- **`Blocked by`** — this item's prerequisites (JSON array of page URLs).
- **`Blocking`** — this item's dependents (the reciprocal).

The orchestrator reads `Blocked by` **directly from each page** during the Phase 1
fetch — it's structured, authoritative, and needs no agent. Map the related page URLs
back to work item IDs (resolve via `userDefined:ID` + `Type`). This relation is the
**primary** hard-edge source.

`declared_deps` from the panel is a **supplement only** — it catches a real dependency
the author described in the body ("after X lands", "builds on") but hasn't recorded in
the `Blocked by` relation yet. Also capture user-stated ordering from `$ARGUMENTS`
(e.g. "FEAT-131 after FEAT-130"). Union all three into the item's hard-edge set.

---

## Phase 2: Classify, Decide, Checkpoint

### Step 2.1: Deterministic classification
Apply per item — this is a mechanical rule, not a judgment call (judgment in-context is
exactly where drift creeps in):

- **RED** if any agent's `files_touched` hits a safety path (`features/assessment`,
  `features/crisis`, `core/services/security`, `core/navigation/`, `app.json`,
  `Info.plist`, `.maestro/`) or mentions `CollapsibleCrisisButton`. Decided first,
  overrides confidence. Step 3.2 re-decides the tier against the real diff:
  - **RED-ATTENDED** — non-test diff under `features/crisis/` or `features/assessment/`,
    or an added/edited `.maestro/` flow. A human approves the merge: the 988 path is
    consequential and hard to reverse, and a new flow needs eyes to confirm it asserts
    something real rather than passing on a selector that matches nothing.
  - **RED-GATED** — every other safety path. Closes mechanically on a green gate.
- **GREEN (auto)** if **all** of: every lens returns `confidence: high`; their
  `files_touched` sets substantially overlap (same problem, same place); zero
  `blocking_constraints`; combined `ambiguities` empty; not RED.
- **AMBER (ask)** otherwise.

### Step 2.2: Dependency resolution & tranche ordering
Build a directed graph over the batch from these edge sources:
- **Hard edges (logical):** the union of each item's `Blocked by` relation (primary),
  panel `declared_deps`, and user-stated ordering. B depends on A ⇒ A must reach `done`
  before B runs, so B branches off a `development` that already contains A's merged code.
- **Soft edges (conflict-risk):** two items whose predicted `files_touched` overlap.
  These don't force a logical order, but the second to run will have to merge-resolve.
  Serial execution + `/b-close` Step 3.1's sync-to-`origin/development` already handles
  the conflict; soft edges only bias the ordering to minimize churn.
  **Ledger files are an invisible soft edge — add them yourself.** `files_touched` is a
  prediction of *authored* edits, so no lens ever lists a repo-wide append-only ledger
  that changes as a SIDE EFFECT of the work. The one that bites here is
  `app/.eslint-baseline.json`: every new test file under `app/src/**/__tests__/` appends
  one line to it (see the Known Gotchas entry), both branches append at the same spot,
  and the second to merge conflicts on that file **and nothing else**. So: if ≥2 items
  in the batch will add a test file under `app/src/`, record a soft edge between them.
  It does not change the tranche order (resolution is trivial — keep BOTH entries, add
  the comma, re-validate the JSON parses, re-run `lint:baseline`), but it stops the
  later merges reading as a real conflict worth diagnosing.

Then:
1. **Topologically sort** the items; hard edges define the order, soft edges break ties.
   The sorted order *is* the tranche order — each item branches off the dev state its
   predecessors produced. **Where neither edge type constrains a pair, put RED-GATED
   items LAST.** Their dominant cost is the sim build, the flow run, and any gate-flake
   diagnosis — none of which the Step 2.4 effort budget prices, because `Effort` scores
   implementation size, not gating. An `S` RED-GATED item can outspend every green in
   the batch combined, and anything sequenced behind it may never start.
2. **Cycle detection:** if hard edges form a cycle, abort with the cycle printed and ask
   the user to break it — do not guess an order.
3. **Cross-batch deps:** if a `declared_dep` (or `Blocked by` relation) is **not** in this
   batch, resolve it against **two** sources — Notion `Status` *and* sibling live
   manifests (a one-shot Notion check alone is a TOCTOU race when another batch is
   mid-flight):
   - Notion `Status: Done` ⇒ satisfied.
   - Else if the dep is an item in a **sibling `.b-batch-state.*.json`** whose `state ≠
     done` ⇒ it is an **in-flight cross-batch dependency**: the dependent is **deferred**
     with a precise message —
     ```
     ⏸️  FEAT-131 ⟂ FEAT-130 (in-flight in batch `debug44-feat130-maint191`) — deferred.
        Co-locate them in one batch, or resume after that batch lands FEAT-130.
     ```
   - Else (not Done, not in any sibling batch) ⇒ **deferred** with the original warning
     (its base wouldn't contain the prerequisite).
4. **Cascade-block:** if A is AMBER-unresolved, RED, parked, deferred, or otherwise not
   going to reach `done` this run, every item with a hard edge to A is **deferred** too,
   `blocked_by: A`, and set Notion **`Status: Blocked`**. A dependent can never run ahead
   of its prerequisite.

Record `depends_on` (hard), `blocked_by`, and `tranche` index on each manifest item.

### Step 2.3: One batched decision pass
For all AMBER items, ask in a **single** `AskUserQuestion` round (up to 4 per call;
batch into as few calls as possible). Each amber's options must include:
- the synthesized approach + the specific ambiguity/divergence, and
- **an "I'm giving you the missing context — treat as GREEN" upgrade option** so your
  answer promotes it to auto-run in this same batch rather than dropping it to manual.

**Spot-verify any UNNAMED defect before it becomes a scope option.** A finding the item's
own ACs don't mention has had no prior review, yet it carries the most scope weight. Re-read
the cited file first — a lens reporting "X is absent" may have found one occurrence and
missed a second. An unverified absence claim can drive an approved scope expansion that is
then reverted, so read the whole file, not the cited block.

**If an amber's options differ in UI layout or placement, put the artifact in the option
`preview` field** — an ASCII wireframe of each candidate, grounded in the real layout
constraints (read the actual styles first, don't sketch from imagination). Per CLAUDE.md
fidelity-matches-progress, early concepts get wireframes; asking someone to choose between
screens they cannot see is what forces a second decision round, which is precisely the cost
this phase exists to avoid.

An amber you don't resolve → leave for a later manual run (record in manifest as `deferred`).

**Scoped upgrade (partial green).** Often an amber can only be *partially* upgraded:
part is auto-runnable, part is blocked / cross-repo / out-of-scope (a design-system
release, or a half whose premise the panel disproved). When the user picks a "scope it
down and run the rest" option, record the item as `green` with a **narrowed** `approach`
string, plus `scoped: true` and a `defer_note` describing the carved-off remainder. The
split is *materialized* in Phase 3 (Step 3.0) — a follow-up Notion item for the remainder
+ a scope-down comment on the original — so the narrowed item closes honestly as `Done`.

### Step 2.4: Soft cap (effort points, plus an item ceiling)
The cap governs **every item that will run `/b-work` this session — GREEN and RED both**
(a RED is implemented headless, then queued; it consumes the same context budget as a green).

Cost has two axes, and a bare item count prices only one of them. Implementation and review
context scale with **effort**; the per-item fixed cost — worktree, skill invocation, CI
round-trip, back-merge — scales with **count**. An `XS` copy fix and an `L` refactor are not
one unit each. So bound both and stop at whichever binds first:

| Budget | Default | Models |
|---|---|---|
| Effort points | **12** | implementation + review context |
| Item count | **6** | per-item fixed overhead |

Points come from the `Effort` property recorded during the Phase 1 fetch — `XS`=1, `S`=2,
`M`=3, `L`=5, `XL`=8, `XXL`=13, the `/b-create` scale, so a batch prices work the same way
the backlog does. A missing `Effort` counts as `M`. Record `effort_points` on each item.

Walk the items **in tranche order**, admitting each while the running total stays inside
*both* budgets, and mark the rest `pending`. **An item that alone exceeds the point budget
still runs, alone** — otherwise an `XXL` is permanently unadmittable and deadlocks its queue.

12 points reproduces the old 4-item cap for the common all-`M` batch while letting the tails
flex: eight `XS` items in one run, or one `XL` on its own. A hard chain longer than the cap
is fine: the prefix lands and merges to `development` this run, so on `--resume` the
prerequisites read as `Done` in Notion and the tail branches off them cleanly — never split a
chain in a way that runs a dependent before its prerequisite is `done`. Tell the user
explicitly:
```
⚠️  7 items / 17 pts exceed the per-run cap (12 pts, 6 items — context hygiene).
   Running 4 now (11 pts); run `/b-batch --resume` after `/clear` to continue.
```
Both are tunable defaults reflecting the context ceiling, not hard limits of the system.

### Step 2.5: Complete the manifest
Upgrade the Step 0.2 stub at `$MANIFEST` in place — same file, same slug, now carrying
everything the classify-and-decide pass produced. Path from Step 0.1b:
`/Users/max/dev/being/.config/.b-batch-state.<slug>.json` — gitignored, survives `/clear`.
The per-batch slug is what lets two concurrent batches coexist without clobbering each
other's `approach` strings + dependency graph (the parts Notion can't reconstruct):
```json
{
  "slug": "<batch slug from Step 0.1b>",
  "created": "<date passed in by user or omitted>",
  "items": [
    { "id": "FEAT-130", "verdict": "green", "tranche": 0,
      "approach": "<synthesized (possibly narrowed) approved approach>",
      "scoped": false, "defer_note": null,
      "effort": "M", "effort_points": 3,
      "depends_on": [], "blocked_by": null,
      "state": "pending", "pr": null, "notes": "" }
  ]
}
```
`state` ∈ `claiming | pending | running | done | parked | queued_red | deferred`. The
approach string and the dependency graph (`tranche`/`depends_on`/`blocked_by`) are the parts
Notion can't reconstruct, so they live here. No item should still read `claiming` after this
step — that value exists only to make the Step 0.2 stub count as in-flight.

**Release every item this pass `deferred`** (amber unresolved, `unresolved-id`, cross-batch
dep) back to `Status: Not started` per the Step 0.2 table, unless it was cascade-blocked —
those get `Blocked` and are already correct. A deferred item is one this batch is handing
back, and leaving it `Batched` is exactly the stranded claim Step 0.0 exists to sweep up.

---

## Phase 3: Serial Execution (greens + reds, ≤ cap)

Walk GREEN **and RED** items **one at a time, in tranche order** (serial — the merge
serializes on `origin/development` anyway, and the simulator is a single serial
resource).

**RED items are NOT skipped — they are implemented, then tiered.** Every GREEN and RED item
runs `/b-work` (Step 3.1) and the safety re-check (Step 3.2); only the close differs —
GREEN and RED-GATED → `/b-close` (Step 3.3); RED-ATTENDED → **stop before close**, mark
`queued_red`, leave the worktree intact for Phase 4.1. A common bug to avoid: leaving a
Phase-2.1 RED un-implemented and then trying to `/b-close` it — there is nothing to close
until `/b-work` has run.

**Before each item, assert its `depends_on` are all satisfied** — each must be `done` in
this run's manifest **or** already `Done` in Notion. If any prerequisite is not satisfied
(it parked, queued_red, deferred, or hasn't run), **skip the dependent**, mark it
`deferred` with `blocked_by`, and set Notion `Status: Blocked` — never branch a
dependent off a `development` that lacks its prerequisite. Set the item's manifest
`state: running` before each.

**Re-check `deferred` items too, between items.** A sibling batch can land a cross-batch
prerequisite mid-run, and nothing else looks until `--resume`. If `blocked_by` is now
satisfied on both sources, clear it and set `state: pending`; run it only if a cap slot
remains AND the remaining context can fund the Phase-1 panel it never got.

**A SOFT edge whose predecessor is `queued_red` doesn't block — but it moves the base.**
A RED predecessor is committed yet never merges unattended, so branch the successor off
`origin/development` anyway (branching it off the RED branch makes a GREEN item
un-auto-closable). Then split the contract: the successor owns the call-site change and
asserts **membership** — "this site reads the token" — never the value the predecessor
hasn't landed. Membership holds before and after; a ratio assertion is red now and a
landmine later. Note the expected merge-time conflict for the attended close.

### Step 3.0: Scope-down bookkeeping (scoped items only)
If the manifest marks this item `scoped: true`, make the eventual close honest **before**
implementing:
1. **Create a follow-up Notion item** for the carved-off remainder via
   `notion-create-pages` into `collection://${NOTION_WORK_DB}`: set `Name`, `Type`,
   `Status: "Not started"`, dimension scores, and a body with `## User Story` /
   `## Acceptance Criteria` / `## Technical Notes` / `## AGENTS REQUIRED` /
   `## Dimension Scores`. Then `notion-fetch` it to read the auto-generated Work Item ID
   and **insert a `## Work Item ID: <ID>` header at the start** (so `/b-work` can find it
   later — mirrors `/b-create` Phase 7.5). If the remainder has a known prerequisite, set
   its `Blocked by` relation.
2. **Comment the scope-down on the original item**: what's done now vs deferred, why, and
   a link to the follow-up. This makes the eventual `Done` truthful — the work matches the
   narrowed scope, and the deferred part is tracked, not lost.
3. The **narrowed** `approach` (not the original AC) is what feeds `/b-work` in Step 3.1.

### Step 3.1: Implement via /b-work
Invoke with the approved approach fed through the existing `ADDITIONAL_CONTEXT` seam:
```
/b-work <ID> - Approved approach: <approach from manifest>
```
**Load each wrapped skill once per batch, not once per item.** `/b-work` and `/b-close`
are large files that load in full on every invocation, and their procedures do not change
between items. Invoke each via the Skill tool for the FIRST item that needs it, then follow
the loaded procedure directly for the rest (say so, so the run stays auditable).

Keep the approach string free of stray safety keywords (`crisis`, `encryption`, `PHQ`,
…) for non-safety stories — `/b-work` Step 3.1 scans `ADDITIONAL_CONTEXT` and would
spuriously invoke a specialist. `/b-work` already writes and runs the relevant
`npm run test:*` suite in its Phase 3.4 — **do not re-run a separate test pass**;
confirm the green result it reports. If `/b-work`'s tests are not green, treat it as an
implementation failure → park (Step 3.4).

### Step 3.2: Authoritative safety re-check (predict → verify)
The Phase-1 classification was a *prediction*. Now that code exists, re-run
`/b-close`'s **own** detection against the real diff (from the worktree):
**Bare-repo lock retry (B2):** under concurrent batches, `git fetch` / `git worktree add`
against the shared bare repo can transiently fail with
`Unable to create '.../packed-refs.lock': File exists` (a sibling batch holds the ref
lock). This is not a real error — wrap any such bare-repo git call to retry 2–3× with a
short backoff (e.g. `for i in 1 2 3; do git ... && break; sleep 2; done`) before treating
it as a failure. Applies here and to the `git fetch origin` in Step 3.3's close path
(b-close performs its own fetches; this note covers b-batch's own direct calls).

```bash
git -C /Users/max/dev/being/<worktree-dir> fetch origin   # retry-on-lock per B2 above
# Exclude test-only files: a jest-test-only change cannot affect what the Maestro
# gate exercises (Maestro drives the running app), so a change confined to
# __tests__/.test./.spec. is NOT a safety-surface change for gate purposes — the
# clinical/crisis jest suites still run in precommit/CI regardless. (Finding A from
# the dry run: MAINT-250, a test-assertion repair under features/assessment/, was
# being mis-queued for a sim-attended run. b-close's own Phase 2.5 grep has the same
# blind spot — see the b-close follow-up note.)
# Two entries in the path set are NOT feature paths and are easy to omit on sight,
# but both reach the gate's own subject matter:
#   - `.maestro/` — a diff that adds or edits a safety flow IS a safety-surface
#     change by definition. The flow is the contract; it cannot be validated
#     without running it, and a flow that has never run is not coverage.
#   - `e2eSeed.ts` — it decides the launch state every flow starts from, so a
#     regression there changes what all of them see while touching no feature
#     path. Nothing else in the tree has that reach.
# Both are UNDER-trigger risks, which is the high-severity direction: a missed
# safety change merges unattended, whereas an unnecessary sim run is only friction.
SAFETY=$(git -C /Users/max/dev/being/<worktree-dir> diff --name-only origin/development...HEAD \
  | grep -vE '(__tests__/|\.test\.|\.spec\.)' \
  | grep -E 'app/(src/features/(assessment|crisis)|src/core/services/security|src/core/navigation/|src/core/config/e2eSeed\.ts|\.maestro/|app\.json|ios/.*Info\.plist)' || true)
# Two exclusions apply to the crisis content detector. The overlay can be re-hosted
# in any SOURCE dir, which is why this check greps content rather than paths — but
# neither excluded class can change what a flow sees, because Maestro drives the
# running app:
#   1. Test files — not in the app bundle at all.
#   2. Comment lines, INCLUDING in source files. Naming the overlay in a comment is
#      not a re-host; it changes no rendered output. Referencing it as a precedent
#      (e.g. its 44pt-visible-target decision) is a normal thing for a comment
#      elsewhere in the tree to do, and must not cost a sim-attended close.
# A line bearing executable code still trips the gate — that is the whole point.
CRISIS=$(git -C /Users/max/dev/being/<worktree-dir> diff origin/development...HEAD -- 'app/**/*.tsx' 'app/**/*.ts' \
  ':(exclude)app/**/__tests__/**' ':(exclude)app/**/*.test.*' ':(exclude)app/**/*.spec.*' \
  | grep -E '^[+-].*CollapsibleCrisisButton' \
  | grep -vE '^[+-][[:space:]]*(//|\*|/\*)' || true)
```

The same test-file exclusion applies to the **Phase 1 prediction** (Step 2.1's RED
rule): a predicted `files_touched` set that hits a safety path *only* via test files
(`__tests__/`, `.test.`, `.spec.`) is **not** RED on that basis alone.
**Routing after the re-check:**
- **RED-ATTENDED** — set `state: queued_red`, leave the worktree intact and the work
  committed, and **do NOT run `/b-close`**. Continue to the next item; Phase 4.1 surfaces it.
- **RED-GATED** — **back-merge `origin/development` first.** It is Step 3.1's sync anyway,
  and `app/scripts/e2e-sim-build.sh` is *app code*: without INFRA-383 on the branch the gate
  builds via `eas build --local` — 10-15 min every run, plus eas-cli login + fastlane —
  instead of ~35-75 s warm. If `app/ios/Podfile.lock` checksums shift, do the
  pod-deintegrate sequence in CLAUDE.md's Known Gotchas or the build dies with
  `MessageQueue doesn't exist`. Then proceed to Step 3.3 and let `/b-close` Phase 2.5 run
  the gate — **do not run flows here**: b-close scopes them (MAINT-237 narrowing spares a
  sim build entirely for service-layer-only changes), verifies sim readiness, and fails
  closed. A flow failure there → `queued_red` with the verbatim output, continue to the next
  item; never weaken a flow, never `--skip-e2e`.
- **GREEN** (re-check clean) → proceed to Step 3.3.

### Step 3.3: Close via /b-close (pre-answer its human prompts)
`/b-close` is written to ask a human at three points; in this unattended loop, answer
them yourself rather than surfacing them:
- **Step 1.3 branch alignment** → continue (the branch is aligned; `/b-work` created it).
- **Phase 2.1 uncommitted changes** → commit them.
- **Phase 5.1 worktree cleanup** → **remove** (the user wants worktrees cleaned on close).

Then run `/b-close <ID>`. Phase 2.5 will correctly self-skip (Step 3.2 already proved
no safety paths changed). On success, manifest `state: done`, capture the PR number.

**Cleanup guard (B1 corollary — NEVER delete a branch/worktree on an unconfirmed merge).**
`/b-close` Phases 3.6–3.8 remove the worktree and delete the feature branch (local +
remote). Those steps are destructive and must be **gated on a verified merge** — if you
drive the merge+cleanup yourself (or inline the bash), assert success *between* the merge
and any cleanup:
```bash
gh pr merge <PR> --merge --delete-branch --admin   # may print, on success:
#   "failed to run git: fatal: 'development' is already used by worktree at ..."
# ^ THIS IS NOT A MERGE FAILURE. It is gh's local-checkout step failing because the dev
#   worktree holds `development` (the documented bare-repo+worktrees skip). The merge
#   itself still went through. NEVER judge merge success by gh's stderr — judge it by:
STATE=$(gh pr view <PR> --json state -q '.state')
MERGE_SHA=$(gh pr view <PR> --json mergeCommit -q '.mergeCommit.oid')
if [ "$STATE" != "MERGED" ] || [ -z "$MERGE_SHA" ]; then
  echo "❌ merge NOT confirmed — preserve branch + worktree, route to Step 3.4(a)"
  # do NOT git worktree remove / git branch -D / git push --delete here
else
  # only now: sync dev worktree, delete remote+local branch, remove worktree
fi
```
Why this is its own rule: the B1 stale-check race (Step 3.4a) refuses the merge **at merge
time**, but a naively-chained cleanup block runs the deletions anyway — orphaning the PR's
head branch (GitHub closes the PR) and forcing a from-commit reconstruction. The commit
object survives (recoverable via `git worktree add <dir> -b <branch> <sha>`), but the clean
fix is to never delete on an unconfirmed merge: leave the branch+worktree intact so Step
3.4(a)'s `/b-close` re-invoke can finish the merge.

### Step 3.4: Close-failure handling (distinguish the two failure modes)
`/b-close` can fail at two different points; **route by the failure signature** — they
have different fixes and conflating them parks items that would self-heal.

**(a) Stale-merge refusal (concurrent-batch race — B1).** When a sibling batch advances
`origin/development` between this batch's push and merge, `/b-close` Step 3.5's
`gh pr merge --admin` is refused with `Required status check "CI pass" is expected` (admin
bypasses approvals but **not** stale-check invalidation). This is **not** a CI failure and
must **not** be parked or RCA'd. `/b-close` is idempotent: **re-invoke `/b-close <ID>`** —
it re-enters Step 3.1, sees the feature branch is now BEHIND, merges `origin/development`
in, re-pushes, re-runs CI once against the correct base, and merges. Bound to **2**
re-invokes (matching the auto-fix cap); if still racing after 2, fall through to park with
a note that it lost the merge race repeatedly (rare — implies very high contention).
**Before re-invoking, confirm the branch + worktree still exist** (Step 3.3's cleanup guard
should have preserved them). If an earlier run deleted them despite the race (the bug that
guard prevents), the feature commit is still a dangling object — reconstruct first:
`git -C /Users/max/dev/being worktree add <dir> -b <branch> <commit-sha>` (find the sha via
`git reflog` or the manifest `notes`), re-create the env symlinks + `npm install`, then
`/b-close <ID>`.

**(b) CI red (flake-first, then bounded auto-fix).** When `/b-close` Step 3.4 STOPs
because CI actually went red:
1. **Attempt 0 — flake check (free, no fix budget):** the repo has a documented
   intermittent safety-test flake. Re-run CI once (`gh run rerun --failed` on the PR's
   latest run, or push an empty recommit only if necessary). If green → continue.
2. **Attempts 1–2 — auto-fix:** route the failing job log through the `/rca` skill,
   apply the fix, **re-run the relevant `npm run test:*` locally to green**, then push
   to re-trigger CI. Max 2 such attempts.
3. Still red after 2 → **park**: manifest `state: parked`, set Notion **`Status: Blocked`**
   (the status exists — it surfaces the item on the board), add a Notion comment
   summarizing the failure + PR link, leave the PR open, continue to the next green.

**Repo-wide blocker check — run this BEFORE parking.** Re-run the failing gate's own
command against a **freshly-synced `development` worktree** — `git -C
~/dev/being/development fetch origin && git -C ~/dev/being/development pull --ff-only`
FIRST. "Clean" is not "current": a worktree sitting on an old commit reproduces any
failure a same-age feature branch hits, so an already-fixed advisory reads as repo-wide
and halts the batch. If it fails on the SYNCED tree too, the blocker is
not this item's: file it as its own INFRA item, park the current item with `blocked_by` set
to it, and **halt the batch** rather than continuing to the next item — every remaining item
would hit the same wall and park identically, each burning a full implement-plus-CI cycle to
rediscover it. Report the blocker as the headline finding, not as a footnote under a parked
item.

Two cheap habits that came out of the same run: a gate reporting an unclassified error
(`audit-ci`'s bare `code undefined:`) is **not** a finding — re-run the underlying command
directly to get the real message before theorising; and confirm a fix hypothesis is even
testable locally before pushing it, since a CI-only fix costs a full round-trip per attempt.

Tell the two apart by the **full rollup** — not the error text, and not
`gh pr checks --watch`. Both refusals name `Required status check` at merge time, and a
push-triggered AND a PR-triggered run can both exist on one commit, so `--watch` can exit
reporting all-green having read only one of them. Always resolve with:
```bash
gh pr view <PR> --json statusCheckRollup -q '.statusCheckRollup[] | "\(.name)\t\(.conclusion)"' | sort | uniq -c
```
Any `FAILURE` row → route **(b)** (CI red), whatever the merge error said. All `SUCCESS`
and still refused → route **(a)** (stale base). Route (a) → re-invoke; route (b) → flake /
repo-wide check / RCA / park. The two routes have opposite fixes, so misrouting is not
harmless: never resolve this from the error text or from `--watch`.

---

## Phase 4: Reds, Pending, and Report

### Step 4.1: Surface the sim-attended queue
For every `queued_red` item: `/b-work` + headless tests have run and the work is
committed in its worktree, stopped before close. List them for a single
simulator-attended session:
```
🛡️  Needs simulator-attended close (safety surface):
   FEAT-211  worktree: feat-211   — run `npm run e2e:safety:build` then `/b-close FEAT-211`
```
**Concurrent-batch note (C3):** the simulator is a single serial resource and the *only*
shared resource the unattended loop never touches — it is reached **only here**, at the
human-attended close. If multiple concurrent batches each surfaced `queued_red` items,
their sim-attended closes all converge on this one simulator: **close them one at a time**
(a single human is doing it, so this serializes naturally — no lock needed). Each
`e2e:safety:build` installs the same `fyi.being.app` bundle, so overlapping builds/closes
would fight over one install; sequential is mandatory.

### Step 4.2: Final report
```
✅ Batch summary
   Done:     FEAT-130, MAINT-191
   Parked:   DEBUG-44 (CI red ×2 — see Notion comment + PR #NN)
   Queued (sim): FEAT-211
   Pending (cap/clear): INFRA-77, MAINT-192
   Deferred (amber unresolved): —
   Blocked (dependency unlanded): MAINT-193 ← blocked_by DEBUG-44 (parked)

   Resume the rest:  /clear  then  /b-batch --resume
```

### Step 4.3: Batch retrospective (conditional — most batches skip this)

Fires **only** on one of two triggers:

- **An orchestration flaw**: an unhandled seam (parse, manifest, resume, sibling-batch,
  merge-race, gate-scoping — like the test-only safety-grep blind spot recorded in
  Step 3.2), or a user correction to how the batch loop itself operates.
- **An observed batching opportunity** (stricter bar, max ONE per batch): nothing broke,
  but a citable pattern in *this* batch shows avoidable cost — e.g. the same human
  prompt answered identically N times that Stage 2 could have batched up front, or a
  reconciliation step repeated per-item that could run once. Cite the count and the
  moments; no observed pattern → no suggestion.

**Not a lesson — skip silently:** anything about an individual work item, any lesson
that belongs to a wrapped skill — those get flagged for `/b-work` or `/b-close`
(their own retrospectives), never duplicated here — and speculative orchestration
features with no observed trigger this batch.

**If a lesson qualifies:**
1. Draft the smallest edit to this file
   (`/Users/max/dev/being/.claude/commands/b-batch.md`) — amend over append.
2. Present as a diff. Because edits here touch resume/concurrency/race logic, the
   justification must show exactly what went wrong, not a hypothetical — but it
   belongs in the **proposal and the commit message, never in the file text**. This
   file loads in full on every run, so a dated incident log (`Observed 2026-08-04: …`,
   `Learned the hard way on MAINT-244 …`) charges every future batch for a one-time
   lesson, and git already stores it — `git log -S` finds the incident on demand.
   Write the **rule and why it holds**; strip the date, the work-item ID, and the
   war story.
3. Never auto-apply. On decline, drop it — do not re-propose.

---

## Phase 5: Resume (`--resume`)

Reconstruct state from disk + Notion + manifest — no in-context memory required.

0. **Select which batch to resume** (manifests are per-batch since Step 0.1b):
   - **`--resume <IDs>`** — recompute the slug from those IDs (Step 0.1b) and load that
     exact `$MANIFEST`. (Deterministic-from-list means the same IDs always map to the same
     file.)
   - **`--resume` alone** — glob `/Users/max/dev/being/.config/.b-batch-state.*.json`:
     - **0 files** → nothing to resume; tell the user and stop.
     - **1 file** → use it.
     - **>1 file** → there are multiple live batches (expected under concurrent use).
       First SPLIT them: a batch whose only non-`done`/`deferred` items are `queued_red`
       has no unattended work left — it belongs in the Phase 4.1 sim queue, not the
       resume picker. List those separately as a reminder and do not offer them as
       resume targets. Present the remainder (slug, `created`, pending/done counts) via
       `AskUserQuestion` and resume the one the user picks; never silently pick one. If
       more than 4 remain, rank by ACTIONABILITY first — a batch holding a `pending`,
       `running`, or `parked` item outranks one whose only non-`done` items are
       `deferred`, whatever its date — then break ties by `created`, newest first. Offer
       the top 4 and say how many were withheld. Recency alone is the wrong key:
       manifests accumulate precisely because their batches finished, so the oldest
       surviving one is often the only one with work left, and a newest-4 cut hides it
       behind batches that have nothing to do.

1. Read the selected `$MANIFEST`.
2. For each item, reconcile against ground truth:
   - Notion `Status`: `Done` → `done` (skip); `Cancelled` → drop; `Testing` → work implemented, resume at `/b-close` (Step 3.3); `In progress` → resume at Step 3.1's tail (verify/commit); `Batched` → this batch's own claim, never implemented (Step 0.0 already reaped any claim no live manifest owns, so a surviving one is ours) → run from Step 3.1; `Not started` → run from Step 3.1; `Blocked` → consult the manifest: `parked` (CI ×2) needs a human triage decision — surface it, don't silently retry; `deferred`/`blocked_by` re-evaluates in step 3 below.
   - `git worktree list` → confirms what's mid-flight on disk.
   - `gh pr list` → confirms what's awaiting/failed CI.
   - `gh pr list --head <branch>` → **an open PR on an item's own head branch means another
     session is driving that close right now.** A worktree is evidence of work; an open PR on
     it is evidence of an owner. Step 0.1c cannot see a plain `/b-work` + `/b-close` run — it
     has no manifest — so a reconciled item is not automatically this batch's to run. Hand it
     off: record the PR, mark `deferred` (`blocked_by: owned by a concurrent session`), and
     never commit, push, or merge on that branch.
   - Re-check `git status --short` **immediately before** any commit in a pre-existing
     worktree, and refuse if `MERGE_HEAD` exists. A clean status read minutes earlier is not a
     clean status now, and `git commit` will silently finalize a foreign staged merge under
     your own invocation — bundling your change into a merge commit and discarding your
     message, so the change vanishes from `git log`.
   - Manifest `queued_red` → still belongs in the sim queue, never auto-close.
3. **Recompute dependency satisfaction** from current Notion `Done` status **and sibling
   manifests** (per Step 2.2.3): a previously `Blocked`/`deferred`/`blocked_by` item whose
   prerequisite is now `Done` becomes runnable again (running it via `/b-work` Step 2.7
   flips its `Status` off `Blocked` to `In progress` automatically); one whose
   prerequisite is still unlanded — or still in-flight in a sibling
   `.b-batch-state.*.json` (`state ≠ done`) — stays `Blocked`. Re-apply the soft cap to
   the remaining runnable greens **in tranche order**, then continue Phase 3.
4. If the manifest is missing, fall back to: derive the queue from any worktrees +
   open PRs + Notion `Testing` items, and tell the user the approach strings were lost
   (so `/b-work` will re-plan those from scratch).

---

## Error Recovery
- Safe to re-run: every phase reconciles against Notion + git + the manifest before acting.
- Interrupted mid-`/b-work` or mid-`/b-close`: those skills are individually idempotent (see their Error Recovery sections); `/b-batch --resume` re-enters at the right step from status.
- Manifest corrupted/missing: Phase 5 step 4 fallback.

---

*File location: /Users/max/dev/being/.claude/commands/b-batch.md*
