# Batch Work Executor [META-COMMAND]

**ARGUMENTS**: $ARGUMENTS

**Format**: `ID1, ID2, ID3, …` (comma- or space-separated work item IDs) — or `--resume`

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
- A safety-surface story is **never** auto-closed. It is implemented, tested headless, and queued for a simulator-attended close.

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

### Step 0.1: Resume vs. fresh
- If `$ARGUMENTS` contains `--resume` → go to **Phase 5 (Resume)** (it handles both
  `--resume` alone and `--resume <IDs>`).
- Otherwise parse the remaining text into an ordered list of WORK_ITEM_IDs (split on commas and/or whitespace; uppercase; validate each against `TYPE-NUMBER` where TYPE ∈ {FEAT, DEBUG, INFRA, MAINT, AGENT}). Drop and report any malformed token; abort only if the list is empty.

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

### Step 0.2: Confirm the list
Echo the parsed list back so the user sees what will run:
```
📋 Batch queue (N items): FEAT-130, MAINT-191, DEBUG-44, …
   Batch slug: debug44-feat130-maint191
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
and technical notes. **Unattended-miss rule:** if an ID still won't resolve after b-work's
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

- **RED (sim-attended close)** if any agent's `files_touched` hits a safety path
  (`features/assessment`, `features/crisis`, `core/services/security`,
  `core/navigation/`, `app.json`, `Info.plist`) or mentions `CollapsibleCrisisButton`.
  RED is decided first and overrides confidence.
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
   predecessors produced.
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

### Step 2.4: Soft cap
The cap counts **every item that will run `/b-work` this session — GREEN and RED both**
(a RED is implemented headless, then queued; it consumes the same context budget as a
green). If that count > **4**, run the first 4 **in tranche order** this session and mark
the rest `pending`. A hard chain longer than the cap is fine: the prefix lands and merges
to `development` this run, so on `--resume` the prerequisites read as `Done` in Notion
and the tail branches off them cleanly — never split a chain in a way that runs a
dependent before its prerequisite is `done`. Tell the user explicitly:
```
⚠️  N items to implement (greens + reds) exceed the per-run cap of 4 (context hygiene).
   Running 4 now; run `/b-batch --resume` after `/clear` to continue.
```
The cap is a tunable default reflecting the context ceiling, not a hard limit of the system.

### Step 2.5: Write the manifest
Persist to the **per-batch** path `$MANIFEST`
(`/Users/max/dev/being/.config/.b-batch-state.<slug>.json` from Step 0.1b — gitignored,
survives `/clear`). The per-batch slug is what lets two concurrent batches coexist without
clobbering each other's `approach` strings + dependency graph (the parts Notion can't
reconstruct):
```json
{
  "slug": "<batch slug from Step 0.1b>",
  "created": "<date passed in by user or omitted>",
  "items": [
    { "id": "FEAT-130", "verdict": "green", "tranche": 0,
      "approach": "<synthesized (possibly narrowed) approved approach>",
      "scoped": false, "defer_note": null,
      "depends_on": [], "blocked_by": null,
      "state": "pending", "pr": null, "notes": "" }
  ]
}
```
`state` ∈ `pending | running | done | parked | queued_red | deferred`. The approach
string and the dependency graph (`tranche`/`depends_on`/`blocked_by`) are the parts
Notion can't reconstruct, so they live here.

---

## Phase 3: Serial Execution (greens + reds, ≤ cap)

Walk GREEN **and RED** items **one at a time, in tranche order** (serial — the merge
serializes on `origin/development` anyway, and the simulator is a single serial
resource).

**RED items are NOT skipped — they are implemented, then queued.** This is the design's
guarantee (run-mode guardrail): a safety-surface story is *implemented + headless-tested*
but never auto-closed. So **both** GREEN and RED items run `/b-work` (Step 3.1) and the
safety re-check (Step 3.2); the only difference is the close — GREEN → `/b-close`
(Step 3.3); RED (whether classified RED at Phase 2.1 or reclassified at Step 3.2) →
**stop before close**, mark `queued_red`, leave the worktree intact for a sim-attended
close (Phase 4.1). A common bug to avoid: leaving a Phase-2.1 RED un-implemented and
then trying to `/b-close` it — there is nothing to close until `/b-work` has run.

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
- **RED** — either a **Phase-2.1 RED** (expected to be RED here; `/b-work` has now
  implemented + headless-tested it) **or** a GREEN the re-check just flipped
  (`SAFETY`/`CRISIS` non-empty): set manifest `state: queued_red`, leave the worktree
  intact and the work committed, and **do NOT run `/b-close`** (it would stall on the
  Maestro sim gate that isn't satisfiable unattended). Continue to the next item. This is
  both the "a green turned out to touch navigation" fix **and** the normal path every
  Phase-2.1 RED takes — implemented, then queued for Phase 4.1.
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
       more than 4 remain, offer the 4 most recently created and say how many were
       withheld — the picker caps at 4 options.

1. Read the selected `$MANIFEST`.
2. For each item, reconcile against ground truth:
   - Notion `Status`: `Done` → `done` (skip); `Cancelled` → drop; `Testing` → work implemented, resume at `/b-close` (Step 3.3); `In progress` → resume at Step 3.1's tail (verify/commit); `Not started` → run from Step 3.1; `Blocked` → consult the manifest: `parked` (CI ×2) needs a human triage decision — surface it, don't silently retry; `deferred`/`blocked_by` re-evaluates in step 3 below.
   - `git worktree list` → confirms what's mid-flight on disk.
   - `gh pr list` → confirms what's awaiting/failed CI.
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
