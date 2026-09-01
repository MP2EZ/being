# Close Work Item & Merge [META-COMMAND]

**WORK_ITEM_ID**: $ARGUMENTS (optional - will auto-detect from current branch if not provided)

**Database ID**: `${NOTION_WORK_DB}` (defined in `CLAUDE.md`)

**GitHub Flow note (INFRA-145)**: Closes the work item to `development` via PR
(no longer local-merge + push, because dev branch protection now requires PRs).
Does NOT promote to `main` — use `/b-release` for that. The `--push` flag is
deprecated (PR merge always pushes); accepted as a no-op for backward compat.

**A multi-slice item closes ONCE, on its final slice.** Step 4.1 sets `Done`
unconditionally and Step 5.1 removes the worktree, so running this on slice 1..n-1
misreports state and destroys the worktree the next slice needs. Land intermediate
slices by hand — Step 3.1–3.7 verbatim, especially 3.4's rollup verdict.

> 💡 For best flow: ensure Accept Edits mode is active (Shift+Tab to cycle).
> This skill makes multiple tool calls (Notion + git + gh CLI) per run.

---

## Phase 0: Detached-close mailbox, then safety-path drift check

### Step 0.0: Read the mailbox first (INFRA-492)

A detached close (Step 2.5.3a) reports through a run directory, not a terminal — so an
un-acknowledged result is work nobody has looked at. Read it before starting new work:

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

Non-zero exit means something needs a human: a named failure verdict, or a run that
stopped writing progress and is presumed dead. Neither is this item's business, but both
must be surfaced now rather than discovered later — that is the whole of AC2. Report each
line, then for a `MERGED` run do its Phase 4 Notion update (the runner deliberately does
not touch Notion) and `touch <dir>/ACK`. Acknowledge nothing you have not acted on; ACK is
the record that a human saw it, and a swept-away failure is exactly the silence detaching
was supposed to remove.

### Step 0.1: Safety-path drift check (INFRA-416)

Phase 2.5 below decides whether the Maestro gate fires by matching changed paths
against a hand-maintained grep. That grep and CLAUDE.md's Protected Paths table
have silently diverged twice — `features/guidance/` (FEAT-55 slice 1 shipped
GREEN) and `features/consent/` (DEBUG-390's fix file matched nothing; the gate
fired only because the branch also touched two `.maestro` flows). Reconciling
them once just resets the clock, so the reconciliation is enforced:

```bash
bash /Users/max/dev/being/.claude/scripts/check-safety-paths.sh || exit 1
# No app/ here means a no-worktree item (Step 1.1) closing from the bare root — run the
# ledger from the development worktree rather than aborting the close on a missing dir.
APP_DIR=app; [ -d app ] || APP_DIR=/Users/max/dev/being/development/app
(cd "$APP_DIR" && npm run check:ci-test-coverage) || exit 1
# Third check, conditional: if the diff touches any .tsx, run `npm run test:accessibility`
# (~30s). It is NOT in precommit, so a design-token violation passes all six local chains
# and fails CI. On a safety-path branch the fix commit then invalidates the provenance
# marker, so it costs a gate rebuild plus a full suite re-run, not just a CI round-trip.
```

The second is the same class of cheap local check: a test file added under `src/**`
that matches no CI `--testPathPattern` runs on nobody's PR, and this gate is in
neither `precommit` nor any hook, so it surfaces only as a red `Safety + privacy
gates` after the PR exists. Fix by pattern, never by renaming a file toward one.

It fails when a Protected Path is neither matched by Phase 2.5's grep nor listed
in the script's `EXEMPT_PATHS` with a recorded reason. ~1s, no network, no build.

**If it fails, fix the lists — do not skip it.** Either add the path to the
`SAFETY_CANDIDATES` grep in Step 2.5.1 *and* map it to a flow in Step 2.5.3, or
add it to `EXEMPT_PATHS` with a written reason. Both are seconds of work, and a
hole here means a 988-affordance change merges unverified.

Note it can fire on work unrelated to yours: `.claude/` is one shared working
tree across concurrent sessions, so another session's tooling edit can introduce
drift into your run. The fix is the same either way, and it is still cheaper than
the failure it prevents.

Not a CI job, deliberately — both files it reads are tracked only on `_bare` and
gitignored on `development`, so no CI checkout can see them; and Phase 2.5's own
Maestro gate is local-only (no CI macOS runners), so a CI guard would go green on
a path list for flows CI can never execute.

---

## Phase 1: Validate & Align Context

### Step 1.1: Parse Arguments & Determine Work Item ID

**Parse command arguments**:
- Extract WORK_ITEM_ID (if provided)
- Extract flags: `--push`, `--skip-e2e`

**Examples**:
```bash
/b-close MAINT-79           # Close without push
/b-close MAINT-79 --skip-e2e  # Bypass Phase 2.5 Maestro gate (HOTFIX BRANCHES ONLY)
```

**Flag detection**:
```
args = [MAINT-79, --push]
→ WORK_ITEM_ID = MAINT-79
→ SHOULD_PUSH = true

args = [MAINT-79, --skip-e2e]
→ WORK_ITEM_ID = MAINT-79
→ SKIP_E2E = true
```

**`--skip-e2e` policy** (INFRA-171): mirrors `--no-verify` from CLAUDE.md. The
Phase 2.5 Maestro gate refuses to bypass on `feat/*`, `fix/*`, or `chore/*`
branches; only `hotfix/*` accepts it (with a loud warning). See Phase 2.5 below.

**If WORK_ITEM_ID provided as argument**:
→ Use provided WORK_ITEM_ID (excluding --push flag)
→ Check remaining args for --push flag

**If no WORK_ITEM_ID provided**:
→ Auto-detect from current branch or worktree

**Option A: From branch name** (when in worktree):
```bash
git branch --show-current
# Example: feat/FEAT-42-easy-navigation-home
# Extract: FEAT-42
```

**Option B: From worktree list** (when on bare repo):
```bash
git worktree list
# Find worktree matching context (e.g., maint-140)
# Uppercase: MAINT-140
```
→ Check args for --push flag

**Validation**:
- Pattern: `[TYPE]-[NUMBER]` (e.g., FEAT-42, DEBUG-15)
- If not found: Error "Cannot determine work item. Provide as argument: /b-close FEAT-42"

**Items with no feature branch** (verification-only, or `.claude/`-only work committed on
`_bare`): auto-detect yields a non-work-item branch name, so pass the ID explicitly. Phase 3
has no PR to open and Phase 5 no worktree to remove — run Phase 0, record Phase 2.5 as
INAPPLICABLE per its no-merge-base branch, then go straight to Phase 4.

---

### Step 1.2: Query Notion for Work Item

**Derive Work Item ID from worktree**:
- Worktree name (lowercase): `maint-140`, `feat-42`
- Work Item ID (uppercase): `MAINT-140`, `FEAT-42`

**Look it up exactly, in one call.** `userDefined:ID` is the unique key — "Work Item ID" is a
display formula `Type-ID`, so MAINT-140 → `userDefined:ID = 140`. Query the data source in
**SQL mode**:
```
mcp__notion__notion-query-data-sources
data: {
  "mode": "sql",
  "data_source_urls": ["collection://${NOTION_WORK_DB}"],
  "query": "SELECT * FROM \"collection://${NOTION_WORK_DB}\" WHERE \"userDefined:ID\" = 140"
}
```
Returns every property directly — no candidate scan, no fetch loop. Confirm `Type` matches
the parsed TYPE: the ID counter is shared across FEAT/MAINT/INFRA/DEBUG, so `292` is unique
on its own, but closing "MAINT-292" must not silently resolve to a FEAT.

**Fallback**, only if SQL mode is unavailable (it is metered on this workspace): semantic
search, which is recency-weighted and has no exact-ID match — widen the page size and match
by **property, never by rank or highlight**.
```
mcp__notion__notion-search
query: "Work Item ID: [WORK_ITEM_ID]"
data_source_url: "collection://${NOTION_WORK_DB}"
query_type: "internal"
page_size: 25
max_highlight_length: 0
```

**Fetch + verify each candidate** (match on `userDefined:ID` — the real unique key — and `Type`):
```
mcp__notion__notion-fetch
id: [page_id or URL from search result]
```

**Extract from fetch response**:
- page_id (from URL)
- Work Item Name (from properties)
- Current Status
- Type

**Validation**: confirm the candidate's `userDefined:ID` equals the parsed ID number and
`Type` matches; the page content's `## Work Item ID: [WORK_ITEM_ID]` header is a secondary check.

**Error handling**:
- If multiple results: fetch each and verify `userDefined:ID` matches exactly — do not pick by rank.
- If no candidate matches: retry the search **once**, recency-biased (`content_search_mode: "ai_search"`,
  add topic words, keep `page_size: 25`), re-scan by property. If still unresolved, STOP and ask:
  *"Couldn't resolve [WORK_ITEM_ID]. Paste the Notion page link and I'll fetch it directly."*
  — then `notion-fetch` the URL and verify the ID.

---

### Step 1.3: Validate Branch Alignment

**Check three sources**:
1. **Claude Code context**: Current git branch from system
2. **Actual git branch**: `git branch --show-current`
3. **Work item**: Type and Name from Notion

**Expected alignments**:
- Branch name pattern: `[prefix]/[WORK_ITEM_ID]-[slugified-name]`
- Prefix matches Type: FEAT→feat/, DEBUG→fix/, INFRA/MAINT/AGENT→chore/

**Validation scenarios**:

**A) All aligned** ✅:
```
✓ Branch: feat/FEAT-42-easy-navigation-home
✓ Work Item: FEAT-42
✓ Type: FEAT → feat/ prefix
✓ All aligned - proceeding
```

**B) Misalignment detected** ⚠️:
Display details and ask:
```
⚠️  Alignment issue detected:
   Current branch: feat/FEAT-41-navbar-updates
   Work item: FEAT-42: Ensure easy navigation to home

Options:
1. Continue anyway (you know what you're doing)
2. Cancel and fix manually
3. Auto-correct (checkout correct branch)

Choice (1/2/3)?
```

**Auto-correct option** (if user chooses 3):
```bash
# Find correct branch for work item
git branch --list "*FEAT-42*"
# If found: git checkout [correct-branch]
# If not found: Error "Branch for FEAT-42 not found"
```

---

## Phase 2: Commit Pending Changes

### Step 2.1: Check for Uncommitted Changes

```
mcp__git__git_status
repo_path: "/Users/max/dev/being/.git"
```

**Scenarios**:

**A) No changes**:
```
✓ No uncommitted changes
  Proceeding to merge
```
→ Skip to Phase 3

**B) Uncommitted changes exist**:
Display summary and prompt:
```
📝 Uncommitted changes found:
   Modified: [count] files
   New: [count] files

Commit these changes? (y/n/view)
- y: Stage and commit all changes
- n: Skip commit (WARNING: changes won't be merged)
- view: Show git diff
```

---

### Step 2.2: Stage & Commit Changes (if user confirms)

**Stage all changes**:
```
mcp__git__git_add
repo_path: "/Users/max/dev/being/.git"
files: ["."]
```

**Generate commit message**:
```
[type]: [WORK_ITEM_ID] [brief description from Notion Name]

[Optional: If testing feedback was provided in conversation, include it here]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Type mapping**:
- FEAT → `feat:`
- DEBUG → `fix:`
- INFRA/MAINT/AGENT → `chore:`

**Commit**:
```
mcp__git__git_commit
repo_path: "/Users/max/dev/being/.git"
message: [generated message]
```

**Display**:
```
✅ Changes committed
   Message: [first line of commit]
   Files: [count] files changed
```

---

## Phase 2.5: Safety e2e Gate (Maestro)

**INFRA-171**: Block push if the branch touches a user-visible safety surface
and the corresponding Maestro flow(s) fail. Local-only — no CI integration.
The gate is the only mechanical enforcement that the safety-surface contracts
(PHQ-9 Q9 single-alert, score-threshold completion banners, GAD-7 severe
handoff, crisis-button reachability) hold end-to-end. Every Jest test mocks
`Alert.alert` and `Linking.canOpenURL`, so these contracts are invisible to
the rest of the test stack.

**INFRA-184 note**: the `LSApplicationQueriesSchemes` (tel/sms) contract is
no longer Maestro-gated here. It's pinned by the jest static-config test at
`app/__tests__/safety/lsApplicationQueriesSchemes.config.test.ts`, which runs
in `npm run precommit` on every commit. A config regression fails the commit,
never reaches Phase 2.5. The `crisis-988-dial.yaml` flow is now tagged
`safety-device-only` and excluded from `npm run e2e:safety` — it's runnable
only against a real device for supplementary runtime verification.

### Step 2.5.0: Sync with origin/development FIRST

Run Step 3.1's merge now, before classifying. Classification and the gate must both see
the diff that will actually merge — otherwise you classify twice and may build twice.
Step 3.1 stays as the idempotent re-check for work that lands while the gate runs.

### Step 2.5.1: Detect safety-surface changes

```bash
# Path-based: dirs/files that obviously host safety contracts. Navigation is
# matched at the whole-dir level (not just CleanRootNavigator) so tab/stack
# re-points like CleanTabNavigator and feature-level navigators are caught.
# Exclude test-only files: a jest-test-only change (under __tests__/ or *.test.* /
# *.spec.*) cannot affect what the Maestro flows exercise (they drive the running
# app), so it must not trip the sim gate. The clinical/crisis jest suites still run
# in precommit/CI regardless. (A test-assertion repair under features/assessment/ —
# e.g. assessmentStore.test.ts — was otherwise mis-triggering the assessment flows.)
#
# Two entries are not feature paths and are easy to omit on sight, but both reach
# this gate's own subject matter — and both are UNDER-trigger risks, the
# high-severity direction:
#   - `.maestro/` — a diff that adds or edits a flow IS a safety-surface change by
#     definition. The flow is the contract; it cannot be validated without running
#     it, and a flow that has never run is not coverage. Without this, a brand-new
#     safety flow merges having never executed once.
#   - `src/core/config/e2eSeed.ts` — it decides the launch state EVERY flow starts
#     from, so a regression there changes what all of them see while touching no
#     feature path. Nothing else in the tree has that reach.
#
# INFRA-416 added `consent` and `guidance` to the features alternation, reconciling
# this grep with CLAUDE.md's Protected Paths table. Both were under-triggers of the
# same shape — a directory whose safety relevance comes from what it HOSTS or
# CONSUMES, not from its name:
#   - `features/consent/` — CombinedLegalGateScreen.tsx hosts the PRE-consent 988
#     footer, the only crisis affordance before a user accepts anything. `LegalGate`
#     is in RootCrisisButton's SUPPRESSED_ROUTES, so the root overlay deliberately
#     does NOT cover for it. DEBUG-390 fixed that footer and this gate fired only
#     because the branch also touched two .maestro flows; the fix file matched
#     nothing on its own.
#   - `features/guidance/` — guidanceGate.ts consumes the PHQ-9/GAD-7 thresholds to
#     route a distressed user to Stoic content or to crisis resources. FEAT-55
#     slice 1 shipped it classifying GREEN because a brand-new feature dir matches
#     no existing pattern.
# `features/practices/` is a Protected Path but is deliberately NOT here: it is
# protected for `philosopher` (classical accuracy), the Validation Matrix gives
# "Therapeutic content (Stoic)" no safety-e2e cell, and no flow pins practice
# content — gating it would charge a sim build for a philosophy review, the
# over-trigger that trains the --skip-e2e reflex. That exemption is RECORDED, not
# implicit: `.claude/scripts/check-safety-paths.sh` fails if a Protected Path is
# neither matched here nor in its EXEMPT_PATHS list. Run it after editing either.
#
# `practices/dailyloop` IS carved back in (DEBUG-465) — the exemption above is
# scoped to the rest of practices, not to this subtree. DailyLoopStepScreen hosts
# SUPPORT_LINE, a crisis affordance routing to CrisisResources, and crisis review
# ruled the root overlay does NOT discharge its above-the-fold obligation. It is a
# fourth instance of the guidance/consent shape: the fix file matched nothing, and
# the gate fired only because the same branch edited a `.maestro` flow.
#
# "Could not compute the diff" is NOT "there is no diff", and a bare `|| true`
# renders them identically. On `_bare` — a true ORPHAN branch (its root commit
# differs from development's; it holds only .claude/, .gitignore, README.md) —
# `origin/development...HEAD` dies with `fatal: no merge base`, the pipeline
# yields empty, and the gate announces "no safety-surface changes detected".
# The verdict happens to be right there (nothing under app/ can change on that
# branch) but it is right by accident, and a safety gate reading green because
# it could not see is the exact shape INFRA-416 was filed to remove. Resolve the
# base explicitly and branch on it, so an inapplicable gate says so.
if ! MERGE_BASE=$(git merge-base origin/development HEAD 2>/dev/null); then
  echo "ℹ️  No merge base with origin/development — this branch shares no history"
  echo "    with the app tree (e.g. _bare, which carries only .claude/ tooling)."
  echo "    Phase 2.5 is INAPPLICABLE, not passing: there is no app diff to classify."
  SAFETY_CANDIDATES=""
else
SAFETY_CANDIDATES=$(git diff --name-only "$MERGE_BASE" HEAD | \
  grep -vE '(__tests__/|\.test\.|\.spec\.)' | \
  grep -E '^app/(src/features/(assessment|consent|crisis|guidance|journal|practices/dailyloop)|src/features/insights/components/|src/features/home/screens/CleanHomeScreen\.tsx|src/features/profile/screens/(DeleteAccountScreen|ProfileScreen)\.tsx|src/core/services/security|src/core/services/speech/|src/core/services/logging/ExternalErrorReporter\.ts|src/core/navigation/|src/core/hooks/|src/core/components/ThresholdEducationModal\.tsx|src/core/config/e2eSeed\.ts|src/core/stores/consentStore\.ts|plugins/|patches/|\.maestro/|app\.json|ios/.*Info\.plist)' || true)
fi

# INFRA-256: drop INERT candidates — diffs that cannot change runtime behavior, so
# the Maestro flows (which drive the running app) have nothing to validate. Discovered
# closing MAINT-254: a 7-line deletion of a zero-call-site function under
# features/assessment/types/scoring.ts tripped q9/phq9/gad7 even though it provably
# cannot affect runtime — friction that trains the --skip-e2e reflex this gate exists
# to prevent. The path grep above is intentionally coarse (file PATH only); this loop
# refines it by INSPECTING each candidate's diff.
#
# Two inert classes are skipped (see the decision table below); EVERYTHING ELSE stays
# gated. The failure modes are asymmetric — UNDER-triggering (a real safety change
# merges ungated) is high-severity; over-triggering (a pointless build) is just
# friction — so every ambiguity biases toward KEEPING the file gated:
#   (a) deletion-only      — ≥1 removed line, 0 added lines (pure dead-code removal).
#   (b) comment/whitespace — every changed (+/-) content line is blank or a comment.
# NOT auto-skipped (consciously, to stay safe): pure type-only edits (bash can't
# distinguish a type annotation from a value without parsing TS) and config files
# app.json / Info.plist (their contracts are pinned elsewhere — the INFRA-184 jest
# static-config test — but a key removal IS a real regression, so keep them gated as
# today). A mixed comment+code line (e.g. `const x = 1 // note`) stays gated.
SAFETY_CHANGED=""
INERT_SKIPS=()
while IFS= read -r f; do
  [ -z "$f" ] && continue
  # Config files bypass the inert filter — always gated if they changed at all.
  # `.maestro/` flows and e2eSeed.ts bypass it too, and for a sharper reason: the
  # inert filter's two classes INVERT on them. A deletion-only diff to a flow is
  # assertions being REMOVED — the contract weakening, the single change class this
  # gate most needs to catch — and the filter would score it inert and skip. (Its
  # comment regex is JS-style too, so it cannot read YAML `#` comments anyway;
  # do NOT teach it `#`, which is a valid TS private-field sigil.)
  case "$f" in
    *app.json|*Info.plist|*/.maestro/*.yaml|*e2eSeed.ts) SAFETY_CHANGED+="${f}"$'\n'; continue ;;
  esac
  # Changed content lines (added + removed), excluding the +++/--- file headers.
  CHANGED_LINES=$(git diff "$MERGE_BASE" HEAD -- "$f" \
    | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' || true)
  ADD_CT=$(printf '%s\n' "$CHANGED_LINES" | grep -cE '^\+' || true)
  DEL_CT=$(printf '%s\n' "$CHANGED_LINES" | grep -cE '^-'  || true)
  # (a) deletion-only: at least one removal, zero additions.
  if [ "$ADD_CT" -eq 0 ] && [ "$DEL_CT" -gt 0 ]; then
    INERT_SKIPS+=("$f — deletion-only ($DEL_CT line(s) removed, 0 added)")
    continue
  fi
  # (b) comment/whitespace-only: there ARE changed lines, and stripping blanks +
  # whole-line comments (//…, /*…, /**…, * …, exact */, single-line /*…*/) leaves
  # nothing. A line bearing any executable code survives and keeps the file gated.
  if [ -n "$CHANGED_LINES" ]; then
    NONCOMMENT=$(printf '%s\n' "$CHANGED_LINES" \
      | sed -E 's/^[+-]//' \
      | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' \
      | grep -vE '^$' \
      | grep -vE '^//' \
      | grep -vE '^\*([[:space:]].*)?$' \
      | grep -vE '^/\*\*?([[:space:]].*)?$' \
      | grep -vE '^\*/$' \
      | grep -vE '^/\*.*\*/$' \
      || true)
    if [ -z "$NONCOMMENT" ]; then
      INERT_SKIPS+=("$f — comment/whitespace-only (no executable line changed)")
      continue
    fi
  fi
  # Live (or ambiguous) change → keep gated.
  SAFETY_CHANGED+="${f}"$'\n'
done <<< "$SAFETY_CANDIDATES"
SAFETY_CHANGED=$(printf '%s' "$SAFETY_CHANGED" | grep -vE '^$' || true)

# A skipped gate is NEVER silent (AC): log every inert-skip decision with its reason.
if [ ${#INERT_SKIPS[@]} -gt 0 ]; then
  echo "ℹ️  INFRA-256: ${#INERT_SKIPS[@]} safety-path file(s) skipped as inert (cannot affect runtime):"
  printf '      • %s\n' "${INERT_SKIPS[@]}"
fi

# Content-based (FEAT-212 gap fix): the crisis overlay (CollapsibleCrisisButton)
# can be re-hosted from ANY feature dir — FEAT-212 moved it into features/profile's
# ProfileStackNavigator, which the path grep above did not match, silently skipping
# the reachability gate on a crisis-surface change. If the diff adds/removes a line
# referencing the overlay anywhere, treat it as a crisis-surface change. NOTE: this
# is deliberately NOT subject to the INFRA-256 inert filter — it is an independent,
# paranoid over-trigger signal; a CODE line referencing the overlay moving at all
# re-arms the reachability flow regardless of how "inert" the surrounding diff looks.
# It IS subject to two exclusions, which are a different question from inertness:
# the overlay can be re-hosted in any SOURCE dir (hence content, not paths), but
# neither excluded class can change what a flow sees, because Maestro drives the
# running app.
#   1. TEST FILES — not in the app bundle at all. Without this, a deleted test that
#      merely RENDERED the overlay gates a sim-attended close on no runtime code.
#   2. COMMENT LINES, INCLUDING IN SOURCE FILES. Naming the overlay in a comment is
#      not a re-host; it changes no rendered output. Citing it as a precedent — its
#      44pt-visible-target decision is the canonical touch-target reference in this
#      repo — is a normal thing for a comment elsewhere in the tree to do, and must
#      not cost a full EAS build plus flow run. Charging one trains exactly the
#      `--skip-e2e` reflex this gate exists to prevent (same reasoning as INFRA-256).
# A line bearing executable code still trips the gate — that is the whole point.
# Guarded on MERGE_BASE for the same reason as SAFETY_CANDIDATES above: with no
# merge base this diff dies too, and an unguarded `|| true` would report "the
# crisis overlay did not move" on a branch where the question is unanswerable.
if [ -n "${MERGE_BASE:-}" ]; then
  CRISIS_HOST_CHANGED=$(git diff "$MERGE_BASE" HEAD -- 'app/**/*.tsx' 'app/**/*.ts' \
    ':(exclude)app/**/__tests__/**' ':(exclude)app/**/*.test.*' ':(exclude)app/**/*.spec.*' \
    | grep -E '^[+-].*CollapsibleCrisisButton' \
    | grep -vE '^[+-][[:space:]]*(//|\*|/\*)' || true)
else
  CRISIS_HOST_CHANGED=""
fi

# INFRA-531 — Layer 1 import-graph detector. An ALARM, never a scope: when a file
# OUTSIDE the Protected Paths set imports a crisis constant, this FAILS the close and
# demands a ruling on that file. It is what makes the "consumes but matches no path
# pattern" class self-closing — five instances were each found by someone happening to
# notice. It SUPPLEMENTS the hand-maintained list and cannot replace it (DEBUG-525,
# settled — do not re-argue): it inverts on the pair that motivated it, produces no
# agent mapping, and is a diff signal rather than a set.
#
# ANCHOR SET — exactly three specifiers (crisis ruling, INFRA-531). The broad
# `@/features/assessment/types` barrel is EXCLUDED although it does re-export the
# thresholds: its ungated importers pull `AssessmentType`/`PHQ9Result` for chart axes
# and export plumbing, so arming it would hard-fail four closes on day one and spend
# the detector's base rate before it caught anything. A binding-qualified barrel arm is
# rejected too — in-tree importers write multi-line imports a line-grep cannot see, and
# that misses SILENTLY, the high-severity direction. Recorded blind spot, bounded:
# `assessment/types/index.ts` is itself inside a gated dir, so what it re-exports cannot
# change ungated; only a NEW ungated consumer of an existing re-export escapes.
#
# Matches BOTH `+` and `-` lines on purpose. A REMOVED crisis import is the
# `useKeyboardFrameHeight.ts` extraction that DEBUG-525 recorded as this detector's own
# miss, and the ruling it demands is "does the new home need a row".
I531_IMPORT_RE="^[+-].*from '(@/features/crisis/constants/|@/features/crisis/types/safety|@/features/assessment/types/scoring)"
i531_hit() { printf '%s\n' "$1" | grep -E "$I531_IMPORT_RE" | grep -vE '^[+-][[:space:]]*(//|\*|/\*)'; }
# Self-test, per DEBUG-390 and check-safety-paths.sh: a source-shape matcher that can no
# longer go red reads as a pass. Each case isolates ONE mechanism — a negative that is
# also a comment would let the comment exclusion mask a broken anchor, and a control that
# conflates two mechanisms stays green while either survives.
i531_matcher_ok() {
  i531_hit "+import { CRISIS_BUTTON_SIZE } from '@/features/crisis/constants/crisisButtonGeometry';" >/dev/null || return 1
  i531_hit "-import { crisisAccessoryProps } from '@/features/crisis/constants/crisisInputAccessory';" >/dev/null || return 1
  i531_hit "+import { detectCrisis } from '@/features/crisis/types/safety';" >/dev/null || return 1
  i531_hit "+import type { PHQ9ScoringResult } from '@/features/assessment/types/scoring';" >/dev/null || return 1
  i531_hit "+import { spread } from '@/features/tarot/constants/spread';" >/dev/null && return 1
  i531_hit "+import type { AssessmentType } from '@/features/assessment/types';" >/dev/null && return 1
  i531_hit "+  // ported from '@/features/crisis/constants/crisisButtonGeometry' in DEBUG-525" >/dev/null && return 1
  i531_hit "+ * see crisisButtonGeometry for the 44pt visible-target decision" >/dev/null && return 1
  i531_hit "+const crisisButtonGeometryFixture = { bottom: 100 };" >/dev/null && return 1
  i531_hit " import { CRISIS_BUTTON_SIZE } from '@/features/crisis/constants/crisisButtonGeometry';" >/dev/null && return 1
  return 0
}
# A ruled-and-recorded exemption. Empty today. Same contract as check-safety-paths.sh's
# EXEMPT_PATHS: an entry is how you say "ruled: not a crisis surface", and it needs a
# reason. Silence is not a ruling.
i531_exempt_reason() {
  case "$1" in
    *) return 1 ;;
  esac
}
I531_ALARM=""
if [ -n "${MERGE_BASE:-}" ]; then
  if ! i531_matcher_ok; then
    echo "🛡️  INFRA-531: the crisis-import matcher failed its own self-test — refusing to close." >&2
    echo "    A matcher that has stopped firing is indistinguishable from a clean tree" >&2
    echo "    (DEBUG-390). Fix the matcher; do not proceed on an unproven detector." >&2
    exit 1
  fi
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    case "$f" in *__tests__/*|*.test.*|*.spec.*) continue ;; esac
    case "$f" in app/src/*.ts|app/src/*.tsx) ;; *) continue ;; esac
    # Membership is tested against SAFETY_CANDIDATES (PRE-inert), never SAFETY_CHANGED,
    # and as an EXACT whole-path match. The two filters answer different questions: this
    # one asks "is the path KNOWN to the Protected Paths list", which no property of this
    # branch's diff can change. Against the post-inert set, an already-ruled file with a
    # deletion-only diff that drops its crisis import reads as ungated and raises a hard
    # failure the developer cannot discharge — the row is already there — so the only exit
    # is --skip-e2e. Verified: swapping in the post-inert set fires on CleanHomeScreen.tsx.
    printf '%s\n' "$SAFETY_CANDIDATES" | grep -qxF "$f" && continue
    i531_exempt_reason "$f" >/dev/null && continue
    I531_HIT=$(git diff "$MERGE_BASE" HEAD -- "$f" \
      | grep -E "$I531_IMPORT_RE" | grep -vE '^[+-][[:space:]]*(//|\*|/\*)' || true)
    [ -n "$I531_HIT" ] && I531_ALARM="${I531_ALARM}      ${f}"$'\n'"$(printf '%s\n' "$I531_HIT" | sed 's/^/          /')"$'\n'
  done <<< "$(git diff --name-only "$MERGE_BASE" HEAD)"
fi
# Prints the path AND the verbatim matched line, and names BOTH legal resolutions. The
# false-fire cost here is a human ruling, not a self-clearing flow run, so a message that
# states only the expensive resolution is the one people learn to bypass. It exits before
# Step 2.5.2, so --skip-e2e cannot reach it: this is a ruling, not a gate run.
if [ -n "$I531_ALARM" ]; then
  echo "❌ INFRA-531: a file OUTSIDE the Protected Paths set imports a crisis constant." >&2
  printf '%s' "$I531_ALARM" >&2
  echo "    Rule on each file above before this close proceeds. Two legal resolutions:" >&2
  echo "      (1) EXEMPT — add the path to i531_exempt_reason() with a recorded reason," >&2
  echo "          if the import carries no 988 affordance or placement decision." >&2
  echo "      (2) GATE — add a Protected Paths row to .claude/CLAUDE.md, add the path to" >&2
  echo "          Step 2.5.1's SAFETY_CANDIDATES grep AND b-batch Step 3.2's copy, and give" >&2
  echo "          it a Step 2.5.3 flow arm plus a decision-table row." >&2
  exit 1
fi
```

**INFRA-256 decision table** — which safety-path change classes skip the gate vs. trigger it (the implementer/maintainer's quick reference; the bash above is the source of truth).
**Adding or changing a row here changes NOTHING on its own.** The mapping executes in Step
2.5.3 — a feature-path clause, plus a `.maestro` case arm for a new flow file. Edit the table
alone and the documented gate and the running gate disagree, with the running one winning.

| Change class under a safety path | Gate? | Why |
|---|---|---|
| Dead-code deletion (≥1 removed, 0 added) | **skip** | Removing unreachable code can't change a running flow (MAINT-254 case). |
| Comment / JSDoc / whitespace-only | **skip** | No executable line changed. A JSX comment does NOT qualify — it closes `*/}`, which the filter's `*/` pattern misses, so a comment-only `.tsx` edit stays gated. Bias-safe; budget the build. |
| Real threshold / scoring edit (assessment) | **trigger** q9/phq9/gad7 | Added executable line → live. |
| Crisis-dir UI / screen / component change | **trigger** crisis-button | Added executable line under `features/crisis/`. |
| `CollapsibleCrisisButton` re-host in ANY dir | **trigger** crisis-button | Content detection (`CRISIS_HOST_CHANGED`), exempt from inert filter. |
| Comment merely NAMING the overlay, in any file | **skip** | Not a re-host; changes no rendered output, so no flow can see it. Citing its 44pt decision as a precedent is normal. |
| `core/services/security` (non-encryption) / `core/navigation` change | **full suite** | Cross-cutting; existing override in Step 2.5.3. |
| `features/consent/` change | **`deeplink-consent-gate` + `reconsent-stale` + `reconsent-stale-ineligible`** | INFRA-416. Hosts the pre-consent 988 footer (`LegalGate` is in `SUPPRESSED_ROUTES`). The dir hosts TWO gated screens: `reconsent-stale` is the only flow rendering `ReConsentScreen`, and mapping it under `consentStore.ts` alone left screen-level edits gated by a flow that never renders them. |
| Unrouted screen ADDED under a gated feature dir | **trigger** | INFRA-428. Render-unreachable is not module-unreachable: a barrel re-export puts the new module on the importer's eager graph, and `CleanRootNavigator` imports `@/features/consent` (the barrel), not the screen file. Keying the gate on "is this screen routed?" would have UNDER-triggered on the branch that raised the question. |
| `features/journal/` change | **`journal-crisis-scan`** | DEBUG-480. Hosts `scanOnSave`, the only crisis scan of typed/corrected text, plus the in-page banner and 988 action. |
| `src/core/services/speech/` change | **`journal-crisis-scan`** + printed notice | DEBUG-524 (crisis ruling). DIRECTORY-level: 2 files, both named. `onDeviceSpeechGuard.ts` admits the capture feeding `scanOnSave` and builds the options driving native audio setup; `audioArtifactSweeper.ts` is the reviewed non-crisis member (raw-audio erasure, not 988 reachability). **Necessary, not sufficient**: the flow finishes inside the ~15s abort window, so it cannot witness a native crash — `npm run e2e:safety:audio-liveness` is the oracle that can. |
| `app/patches/` change | **`crisis-button-reachability`** + printed notice | DEBUG-524 (crisis ruling). Same shape as `plugins/`: a patch alters native behaviour on a crisis path and the generated result is never reviewed. DEBUG-524 established a patch is the only remaining lever on the recognizer's audio teardown, so this path is live, not hypothetical. |
| `src/core/hooks/` change | **`journal-crisis-scan`** + 2 printed notices | DEBUG-525. Gated as a DIRECTORY: 3 of 4 files decide crisis-affordance placement/visibility; the 4th has one lifetime commit — and is NOT benign (corrected DEBUG-533: `useBugReportShake.ts` arms a root-mounted gesture opening a zero-988 window). `journal-crisis-scan` is the only keyboard-up flow in the suite. `useKeyboardOccludesCrisisButton` (device-only) and the dynamic-type inset get instructions — neither is sim-runnable. |
| `core/components/ThresholdEducationModal.tsx` change | **`crisis-button-reachability`** | DEBUG-525. A DEBUG-406 conversion site: an RN `<Modal>` whose content tells the reader to seek help while occluding the route to it. The flow already taps through it, so the arm is free. |
| `features/home/screens/CleanHomeScreen.tsx` change | **`crisis-button-reachability`** | DEBUG-547. Consumes `crisisButtonGeometry` rather than owning crisis code. The FAB's `zIndex: 9999` makes any overlap a wrong-DESTINATION tap into `CrisisResources` — a crisis false POSITIVE. The flow already starts on Home and renders both rows, so the arm is free. **The flow is necessary and NOT sufficient**: Maestro taps element CENTRES, which never enter the contested column, so a point tap is required to falsify this. |
| `features/profile/screens/DeleteAccountScreen.tsx` change | **`crisis-button-reachability`** + device-only notice | INFRA-531 (crisis ruling). Consumes `crisisInputAccessory`; the keyboard is necessarily up (the user types the confirmation word), so on iOS the accessory is the SOLE 988 affordance. FILE-level — the dir's other members carry no crisis surface and `ProfileStackNavigator` is already covered by `CRISIS_HOST_CHANGED`. **Necessary, not sufficient**: the flow never types into `delete-confirm-input`, so the keyboard-up half is `crisis-keyboard-accessory` (`safety-device-only`). |
| `features/profile/screens/ProfileScreen.tsx` change | **`crisis-button-reachability`** | DEBUG-533 (crisis ruling). Hosts the second entry to `showFeedbackForm()`, which opens a zero-988 window. The flow already walks the Profile tab and every subscreen depth, so the arm is free. **Necessary, not sufficient**: no flow opens the widget, so this proves only that Profile still renders the overlay. |
| `core/services/logging/ExternalErrorReporter.ts` change | **printed notice** — no flow | DEBUG-533 (crisis ruling). `showFeedbackForm()` is the presenter and `feedbackIntegration` is what mounts the provider at all. NOTICE ONLY: no sim flow opens the widget, and authoring one would emit a real Sentry feedback event — the gate build resolves a live DSN from `.env.production` (the `e2e-sim` profile sets only the two E2E keys). Same shape as `plugins/`: the real verification is an attended device session. |
| An UNGATED file imports a crisis constant | **hard close FAILURE** — no flow | INFRA-531. `I531_IMPORT_RE` over the diff, anchored on the import specifier. An ALARM demanding a ruling (Protected Paths row + arm, or a recorded `i531_exempt_reason()` entry), never a silent flow pick. Exempt from the inert filter: class (a) *inverts* here — a removed crisis import is the extraction case it exists to catch — and class (b) is already discharged by its own comment exclusion. Membership is tested against `SAFETY_CANDIDATES` (pre-inert), or an already-ruled file with a deletion-only diff raises a failure nobody can discharge. Exits before Step 2.5.2, so `--skip-e2e` cannot reach it. |
| An ungated file imports the broad `@/features/assessment/types` barrel | **not detected** (recorded blind spot) | INFRA-531. The barrel re-exports the thresholds, but its ungated importers pull `AssessmentType`/`PHQ9Result` for chart axes and export plumbing — arming it would hard-fail four closes on day one. A binding-qualified arm is rejected: multi-line imports are invisible to a line-grep, and that misses silently. Bounded: `assessment/types/index.ts` is itself gated, so only a NEW ungated consumer of an existing re-export escapes. |
| `app/plugins/` change | **`crisis-button-reachability`** + printed notice | FEAT-522. A config plugin injects native code that can occlude every 988 affordance, and iOS is CNG so no AppDelegate diff is ever reviewed. No sim flow can observe it — Maestro drives an ACTIVE app and the shield exists only while inactive — so the arm proves the surrounding crisis paths still render and the notice points at the attended device script. |
| `features/insights/components/` change | **`crisis-button-reachability`** | INFRA-532. Gated as a DIRECTORY: 4 of 6 members are safety-bearing — two DEBUG-406 conversion sites plus the two files that publish them into the root overlay slot and decide whether either ever renders (`WeeklyReflectionCard`'s `MIN_CHECK_INS_TO_SHOW`, `WellnessScreeningTrends`' `notesEnabled`). The other three are `DotCalendar.tsx`, `PrincipleEngagementChart.tsx` and the barrel. The flow taps through `WeeklyReflectionComposer`, reachable only because `e2eSeed.ts` seeds four non-`daily` check-ins. **Necessary, not sufficient**: Maestro taps element CENTRES, so a marginal action-row geometry regression is invisible here — that is `modalOcclusionConversions.test.tsx`. `SessionNoteComposer` stays notice-only (flag-dark in the gate build); keyboard-up stays uncovered pending the `crisis-keyboard-accessory` repair. |
| `features/guidance/` change | **`guidance-suppressed-handoff` + `guidance-gentle-tier-cap`** | FEAT-457 + INFRA-420. The first drives Home entry → suppressed → notice → CrisisResources → 988 with all four tier testIDs ABSENT; the second pins the positive branch (Tier 0/1 shown, Tier 2/3 capped). Both arms are required — suppression alone stays green if the gate suppresses everyone. Supersedes the INFRA-416 crisis-button fail-safe. |
| `features/practices/dailyloop/` change | **`daily-loop-quick-depth` + `daily-loop-deeplink`** | DEBUG-465. Hosts SUPPORT_LINE, pinned outside the ScrollView; the root overlay does not discharge its above-the-fold obligation. INFRA-509 narrowed this from the full suite: these two are the only tagged flows carrying a daily-loop testID, so they ARE that coverage. A `DailyLoopDepthSelectScreen` edit additionally prints the `e2e:safety:ax5` instruction (DEBUG-469's `CRISIS_FAB_CLEARANCE` is invisible to centre-tapping flows). |
| `features/practices/` change (outside `dailyloop/`) | **not gated** (recorded exemption) | INFRA-416. Protected for `philosopher`, not 988 reachability; no safety-e2e cell in the Validation Matrix. Pinned by `check-safety-paths.sh`. |
| Test-only file (`__tests__/`, `.test.`, `.spec.`) | **skip** | Drives nothing in the running app (pre-existing exclusion). |
| `app.json` / `Info.plist` change (incl. deletions) | **gated as today** | Bypasses inert filter; contracts pinned by the INFRA-184 jest test, but keep the coarse net. |
| `.maestro/<flow>.yaml` added or edited | **trigger** that flow | The flow IS the contract; one that has never run is not coverage. Bypasses the inert filter — a deletion-only diff here is assertions being removed. |
| `.maestro/_<helper>.yaml` edited | **its transitive `runFlow:` callers** | INFRA-517. `runFlow:` is a static per-file include, so a helper reaches exactly its callers — measured on INFRA-494, where a `_legal-and-onboarding.yaml` diff ran 12 sim flows and its only two callers are both `safety-device-only`. Callers that cannot run in the sim get a NOT-VERIFIED notice; the Step 2.5.3 net then still runs `crisis-button-reachability`, so this is one flow, never zero. Falls back to the full suite on any of: a `config.yaml`, matcher self-test failure, unreconciled residue, a depth-capped closure, or zero callers. |
| `.maestro/crisis-988-dial.yaml` edited | **no sim flow** — hardware notice | `safety-device-only`; sim `canOpenURL` is unconditionally false, so it cannot pass here. Run `e2e:safety:988-dial` on a real iPhone. |
| A screen carrying `CRISIS_FAB_CLEARANCE` changed, or `CollapsibleCrisisButton` | **notice only** — never scoped | INFRA-510. `reconsent-stale-ineligible-fab-clearance` is `safety-bottom-inset` and declares 393x852; 375x667 has a zero bottom inset, so the collision cannot occur there at any clearance value. Scoping it beside a 375x667 flow is unsatisfiable on one device — the shape that trains `--skip-e2e`. |
| `.maestro/<flow>.yaml` tagged `safety-dynamic-type` edited | **no sim flow** — instruction | DEBUG-469 / DEBUG-507. The suite selects on an exact `- safety` tag at the DEFAULT content size, so it can neither select nor validly run these. `e2e:safety:ax5` (AX5) and `e2e:safety:xxxl` (largest non-accessibility step) own them. Each needs its own case arm; the `*)` catch-all would fire a pointless full suite. |
| `src/core/stores/consentStore.ts` | **`deeplink-consent-gate` + `reconsent-stale` + `reconsent-stale-ineligible`** | INFRA-482. File-level, not `src/core/stores/`. Owns the consent-record writes, `canPerformOperation`, the forging seam, and the safety-critical `loadConsent` branch order. Siblings in that dir have no safety surface. |
| `src/core/config/e2eSeed.ts` | **full suite** | Sets the launch state every flow starts from; no narrower scope is valid. |
| Mixed comment + code on one line / pure type-only edit | **trigger** | Bash can't safely prove inert → bias safe. |

If BOTH `SAFETY_CHANGED` and `CRISIS_HOST_CHANGED` are empty → skip the gate:
```
ℹ️  No safety-surface changes detected — skipping Maestro e2e gate
```
Proceed to **Step 2.5.3a**, not Step 3.1: the handoff decision is reached on every close,
and a gate-less one is the case with least reason to hold a session. `FLOWS` is empty and
`FULL_SUITE` unset, so a detached run takes `--no-flows`.

### Step 2.5.2: Honor `--skip-e2e` flag (hotfix-only)

If the gate is active (`SAFETY_CHANGED` OR `CRISIS_HOST_CHANGED` non-empty) AND `SKIP_E2E=true`:

```bash
CURRENT_BRANCH=$(git branch --show-current)
case "$CURRENT_BRANCH" in
  hotfix/*)
    echo "⚠️  --skip-e2e on hotfix/* — bypassing Maestro gate."
    echo "   Document the reason in the PR body."
    # proceed to Step 3.1
    ;;
  *)
    echo "❌ --skip-e2e is only permitted on hotfix/* branches"
    echo "   (mirror of --no-verify policy from CLAUDE.md)."
    echo "   Run Maestro flows (npm run e2e:safety) or rebase onto a"
    echo "   hotfix/* branch if this is genuinely urgent."
    exit 1
    ;;
esac
```

### Step 2.5.3: Map changed paths to scoped flow(s)

Avoids running all 5 flows on every safety touch (~3-4 min full run trains
`--skip-e2e` reflex). Match changed paths to the minimal set of flows that
pin the surfaces affected.

```bash
# INFRA-483 — this holds FLOW NAMES, not npm script names, because Step 2.5.5 passes the
# whole set to ONE `e2e-safety.sh` invocation. The simulator lease is taken and released
# per PROCESS (e2e-safety.sh:266-267 acquire + trap), so a loop of `npm run` calls drops it
# between every flow, and a peer's gate build landing in one of those gaps installs over
# the target and fails the NEXT flow's pre-flight. The per-flow `e2e:safety:*` scripts stay
# in package.json for manual use; they must keep routing through `e2e-safety.sh`.
FLOWS=()
# Declared HERE, once. It used to be re-declared empty further down — AFTER the
# practices/dailyloop clause had already set it — which discarded DEBUG-465's carve-in, so
# a dailyloop-only change fell through to the crisis-button fail-safe instead of the full
# suite. A single declaration point is what makes the override order legible.
FULL_SUITE=""
# --- Classify: which safety changes are RENDER/BOOT-relevant vs SERVICE-LAYER-only? ---
# The sim flows drive the UI; they can ONLY validate render / boot / navigation surfaces.
# Pure service-layer code is jest-owned (precommit + CI's crisis/clinical/security/
# encryption suites + the CollapsibleCrisisButton render tests) and need not pull a sim
# build. Two carve-outs, both fail SAFE (a file leaves the sim-relevant
# set only when unambiguously non-UI).
# NOTE (INFRA-383, corrected INFRA-508): these carve-outs were originally sized against a
# 10-15 min EAS build, on the reasoning that charging one for a service-layer change trains
# the `--skip-e2e` reflex. This used to add that the build is "now ~1 min warm, so that cost
# argument no longer holds" and the carve-outs could be re-widened. **Do not act on that.**
# Measured over five instrumented runs: 1-4 min warm but 11-14 min whenever the native
# project regenerates, and before INFRA-508 any `app/package.json` move fired one. The cost
# argument still holds; re-widening needs a fresh measurement, not this sentence. Left as a
# recorded opportunity only:
#   1. features/crisis/services/**  — crisis BACKEND services (e.g. CrisisSecurityProtocol),
#      not the overlay / screens / components the crisis-button flow renders.
#   2. core/services/security/** EXCEPT EncryptionService / SecureStorageService —
#      monitoring / metrics / network / protocol layer. Encryption + SecureStorage ARE
#      boot/render-critical (wellness data decrypts at assessment render; encryption init
#      gates app boot), so they STAY in the sim-relevant set.
# If you ever wire a NEW security/crisis service into app boot or the crisis overlay's
# import graph, DROP it from the carve-out so its changes re-arm the smoke test.
RENDER_BOOT_RELEVANT=$(echo "$SAFETY_CHANGED" | awk '
  /src\/features\/crisis\/services\// { next }
  /src\/core\/services\/security\// {
    # Bare regex, NOT `$0 ~ …`: the harness substitutes $0 with the run’s arguments when
    # rendering this file, so a copied `$0` matches nothing and drops every security file
    # from the render-boot set — failing toward not gating. Bare regex matches $0 implicitly.
    # This has recurred twice. An extract-based harness CANNOT catch it: it reads this file on
    # disk, where $0 is still $0. Re-run any new check against a $0-substituted copy of the block.
    if (/EncryptionService|SecureStorageService/) { print }
    next
  }
  { print }
')
# Crisis UI dir touched (overlay/screens/components — services/ already carved out) OR the
# overlay re-hosted/edited anywhere (FEAT-212 content detection) → reachability flow.
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/crisis/' || [ -n "$CRISIS_HOST_CHANGED" ]; then
  FLOWS+=("crisis-button-reachability")
fi
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/assessment/' && \
  FLOWS+=("q9-single-alert" "phq9-severe-completion" "gad7-severe")
# INFRA-416: features/consent hosts the PRE-consent 988 footer (CombinedLegalGateScreen),
# and LegalGate is in SUPPRESSED_ROUTES so the root overlay does not cover for it.
# deeplink-consent-gate.yaml is the flow that lands on that screen and asserts the
# affordance, so it is the correct scoped target — NOT the fail-safe crisis-button.
# INFRA-510 added reconsent-stale-ineligible: the dir hosts THREE gated screens and the
# ineligible one was mapped by nothing, so an edit to it was gated by flows that never
# render it. Its cohort is minors, on a screen whose route sets gestureEnabled: false and
# headerShown: false with ONE control and no in-screen crisis section — the root overlay is
# its only 988 affordance, and this flow is the only witness to it.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/consent/' && \
  FLOWS+=("deeplink-consent-gate" "reconsent-stale" "reconsent-stale-ineligible")
# DEBUG-480: features/journal hosts scanOnSave — the app's only crisis scan of text a
# user typed or corrected — plus journal-crisis-banner and journal-crisis-call-988.
# journal-crisis-scan.yaml is the flow that drives that surface, so it is the scoped
# target. Without this clause a journal-only source change falls through to the
# crisis-button fail-safe, which gates the wrong contract.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/journal/' && \
  FLOWS+=("journal-crisis-scan")
# DEBUG-524: onDeviceSpeechGuard.ts admits the capture feeding scanOnSave and builds the
# options driving native audio setup. NECESSARY, NOT SUFFICIENT — journal-crisis-scan finishes
# inside the ~15s abort window, so it cannot witness the native crash; that verdict is
# `npm run e2e:safety:audio-liveness`, which dwells past the deadline and reads the app's pid.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/core/services/speech/' && \
  FLOWS+=("journal-crisis-scan")
# DEBUG-524: a patch alters native behaviour on a crisis path and the generated result is never
# reviewed in a diff. No sim flow can bound an arbitrary patched module, so the arm proves the
# surrounding crisis paths still render and the notice points at an attended device session.
echo "$RENDER_BOOT_RELEVANT" | grep -q '^app/patches/' && \
  FLOWS+=("crisis-button-reachability")
# INFRA-482: consentStore.ts is FILE-level, not the whole of src/core/stores/. It owns every
# consent-record write, `canPerformOperation`, the INFRA-377 forging seam, and the loadConsent
# branch order whose own comment says "THE ORDER OF THESE THREE CHECKS IS SAFETY-CRITICAL" —
# testing `revoked` after `version` re-prompts someone who deliberately withdrew (GDPR Art.
# 7(3)). Its only two siblings there (settingsStore, subscriptionStore) carry no safety surface,
# and gating the directory would charge a sim build for a subscription edit — the over-trigger
# that trains the --skip-e2e reflex. `assessmentStore.ts` is already covered via
# features/assessment/. Scoped to the two flows that exercise consent state end-to-end rather
# than the full suite: unlike e2eSeed.ts it does not author the launch state, it classifies a
# record that already exists.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/core/stores/consentStore\.ts' && \
  FLOWS+=("deeplink-consent-gate" "reconsent-stale" "reconsent-stale-ineligible")
# DEBUG-525: four entries that CONSUME crisisButtonGeometry rather than owning crisis code.
# ThresholdEducationModal is an RN <Modal> DEBUG-406 conversion site — a zero-988-affordance
# render state whose own content tells the reader to seek help. crisis-button-reachability
# already TAPS THROUGH it (lines ~269-300: profile-assessment-info -> threshold-education-
# overlay -> crisis-button-root -> crisis-resources-screen), so this arm costs nothing new.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/core/components/ThresholdEducationModal\.tsx' && \
  FLOWS+=("crisis-button-reachability")
# DEBUG-547: CleanHomeScreen carries a CRISIS_BUTTON_EXCLUSION_RECT inset. The FAB's
# zIndex:9999 makes any overlap a wrong-DESTINATION tap into CrisisResources — a crisis
# false POSITIVE, not an unreachable affordance. crisis-button-reachability already starts
# on Home and renders both rows, so the arm costs no new flow. File-level, not
# features/home/: the rest of that directory carries no crisis surface.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/home/screens/CleanHomeScreen\.tsx' && \
  FLOWS+=("crisis-button-reachability")
# INFRA-531 (crisis ruling D): DeleteAccountScreen spreads crisisAccessoryProps() onto its
# confirmation TextInput. The keyboard is NECESSARILY up here — the user must type the
# confirmation word — and on iOS the input accessory is then the SOLE 988 affordance
# (DEBUG-431 ruled the occluded state a defect against <3 taps from any screen). Dropping
# that one prop spread is a silent keyboard-up 988 blackout on the surface where someone is
# irreversibly ending their relationship with the app. FILE-level, not features/profile/:
# the dir's 15 other non-test files carry no crisis surface, and ProfileStackNavigator — the
# one that does — is already covered by CRISIS_HOST_CHANGED, so a directory clause would buy
# nothing and charge a sim build to every Profile edit.
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/profile/screens/DeleteAccountScreen\.tsx'; then
  FLOWS+=("crisis-button-reachability")
  echo "⌨️  DeleteAccountScreen changed — it consumes crisisInputAccessory. The flow arm is"
  echo "   NECESSARY BUT NOT SUFFICIENT: crisis-button-reachability reaches this screen and"
  echo "   taps through to CrisisResources, but never types into delete-confirm-input, so it"
  echo "   exercises the UNOCCLUDED overlay and cannot observe the accessory contract."
  echo "   The keyboard-up half is device-only: npm run e2e:safety:keyboard-accessory"
fi
# DEBUG-533: the two entries to showFeedbackForm(), which opens a zero-988 window that
# cannot be converted in place (the occluder is Sentry's, not ours). ProfileScreen gets a
# real arm because crisis-button-reachability already walks the Profile tab and every
# subscreen depth, so it costs nothing and proves the overlay still renders there.
# ExternalErrorReporter gets a NOTICE, not an arm: no flow opens the widget, and one that
# did would emit a real Sentry feedback event — the gate build resolves a live DSN from
# .env.production. An arm nobody can satisfy is the shape that trains --skip-e2e.
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'features/profile/screens/ProfileScreen\.tsx'; then
  FLOWS+=("crisis-button-reachability")
  echo "🪟 ProfileScreen changed — it hosts the second entry to showFeedbackForm(). The arm"
  echo "   is NECESSARY BUT NOT SUFFICIENT: the flow proves Profile still renders the root"
  echo "   overlay, but never opens the widget, so it cannot observe the occlusion itself."
fi
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'core/services/logging/ExternalErrorReporter\.ts'; then
  echo "🪟 ExternalErrorReporter changed — showFeedbackForm() opens a zero-988-affordance"
  echo "   window (ruling recorded at that method) and feedbackIntegration is what mounts"
  echo "   the provider at all. NO sim flow can observe this. If the diff touches either,"
  echo "   the verification is an attended device session — see DEBUG-533."
fi
# core/hooks/ is gated as a DIRECTORY (3 of 4 files are crisis-critical; see CLAUDE.md).
# journal-crisis-scan is the only keyboard-up flow in the tagged suite and reaches
# useKeyboardFrameHeight through VoiceReflectionScreen, so it is the scoped target. The two
# hooks it CANNOT witness get instructions, not a full suite — same precedent as 988 below.
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/core/hooks/'; then
  FLOWS+=("journal-crisis-scan")
  echo "⌨️  A core/hooks/ file changed — these decide crisis-affordance placement and"
  echo "   visibility. journal-crisis-scan covers the keyboard-up inset path. Two surfaces"
  echo "   it cannot witness, both outside the tagged suite:"
  echo "     npm run e2e:safety:keyboard-accessory   (hardware — the only flow pinning"
  echo "       useKeyboardOccludesCrisisButton via CrisisKeyboardAccessory)"
  echo "     npm run e2e:safety:xxxl                 (dynamic-type — DEBUG-507/516's pin"
  echo "       on the journal save inset)"
fi
# The two insights composers are DEBUG-406 conversion sites rendering into the root overlay
# slot. WeeklyReflectionComposer now has a real sim flow (INFRA-532): crisis-button-reachability
# taps through it, reachable because e2eSeed.ts seeds four non-'daily' check-ins past
# WeeklyReflectionCard's MIN_CHECK_INS_TO_SHOW gate. SessionNoteComposer stays notice-only —
# it is flag-dark in the gate build, and an arm that cannot be satisfied is the shape that
# trains --skip-e2e.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'insights/components/WeeklyReflectionComposer\.tsx' && {
  FLOWS+=("crisis-button-reachability")
  echo "🪟 WeeklyReflectionComposer changed — a DEBUG-406 conversion site. The Insights block"
  echo "   of crisis-button-reachability taps through it (occlusion arm + mis-tap arm)."
  echo "   NECESSARY, NOT SUFFICIENT: Maestro taps element CENTRES, which never enter the"
  echo "   crisis button's contested column, so a marginal action-row geometry regression is"
  echo "   invisible to it. CI-side pin: __tests__/safety/modalOcclusionConversions.test.tsx"
  echo "   NOT covered by any runnable flow: the keyboard-up path."
  echo "     crisis-keyboard-accessory is safety-device-only AND currently red on arrival —"
  echo "     it scrolls to weekly-reflection-card with no check-in preamble, and the e2eSeed"
  echo "     fix cannot reach it (the device build resolves no e2e-sim profile). Do not cite"
  echo "     it as coverage until that is repaired."
}
echo "$RENDER_BOOT_RELEVANT" | grep -q 'insights/components/SessionNoteComposer\.tsx' && {
  echo "🪟 SessionNoteComposer changed — the only site that occluded TWO 988 affordances,"
  echo "   entered by tapping a point on the reader's own PHQ-9/GAD-7 chart. NO sim flow"
  echo "   can reach it: eas.json's e2e-sim profile sets wellness_trend_notes:false, so it"
  echo "   is dark in the gate build. CI-side pin:"
  echo "   __tests__/safety/modalOcclusionConversions.test.tsx"
}
# FEAT-457: features/guidance now HAS a flow, closing the INFRA-416 coverage gap this
# clause used to log. guidanceGate.ts consumes the PHQ-9/GAD-7 thresholds to route a
# distressed reader to Stoic content vs crisis resources; guidance-suppressed-handoff
# drives Home entry → suppressed → notice → CrisisResources → 988 and asserts all four
# tier testIDs ABSENT. It replaces the crisis-button fail-safe, which pinned reachability
# of a different affordance and never exercised this routing at all.
# INFRA-420 adds the POSITIVE branch: guidance-gentle-tier-cap asserts a non-suppressed
# reader receives Tier 0/1 and that Tier 2/3 stay capped. Both arms are needed — the
# sibling alone stays green if the gate suppresses EVERYONE.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/guidance/' && \
  FLOWS+=("guidance-suppressed-handoff" "guidance-gentle-tier-cap")
# DEBUG-465: practices/dailyloop hosts SUPPORT_LINE (a crisis affordance) on a beat
# chosen by showsSupportLine(), pinned OUTSIDE the ScrollView. INFRA-509 narrowed this
# from the full suite: daily-loop-quick-depth IS the DEBUG-465 pin — above-the-fold at
# offset 0, tap-through to CrisisResources, does-not-scroll-away, the exactly-once
# negative, plus the DEBUG-403 resume-overlay occlusion test; daily-loop-deeplink adds
# the cold-start entry. No other tagged flow contains a daily-loop testID, so these two
# ARE the coverage the full suite was providing. Not a file-level split: config/tenseMode.ts
# is eager in CleanRootNavigator's graph (FEAT-376), but both flows launchApp, so a
# module-load break is red here too — and its three exported symbols are consumed only
# inside handleDailyLoopComplete, a DailyLoop-only callback. Route suppression is
# unreachable from here (SUPPRESSED_ROUTES/IMMERSIVE_ROUTES live in RootCrisisButton.tsx;
# the root route name lives in core/navigation) — both already mapped by their own clauses.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/practices/dailyloop' && \
  FLOWS+=("daily-loop-quick-depth" "daily-loop-deeplink")
# DEBUG-469: DailyLoopDepthSelectScreen carries CRISIS_FAB_CLEARANCE — without it a
# practice-choice tap on a card's right-hand end silently navigates to CrisisResources
# (a crisis FALSE POSITIVE) — and the AX5 blurb relocation. The tagged suite taps element
# CENTRES at the default content size, so neither flow above can see either; its owner is
# daily-loop-ax5-entry.yaml, which is safety-dynamic-type and structurally outside the
# suite. Surfaced as an instruction, exactly like the flow-file arm below.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'dailyloop/screens/DailyLoopDepthSelectScreen' && {
  echo "🔠 DailyLoopDepthSelectScreen changed — it carries DEBUG-469's CRISIS_FAB_CLEARANCE"
  echo "   inset and the AX5 blurb relocation. The tagged suite taps element CENTRES and"
  echo "   runs at default content size, so it cannot see either. Validate directly:"
  echo "   npm run e2e:safety:ax5"
}
# INFRA-510: the FAB-clearance collision has no sim-suite owner and must not acquire one.
# Detected by CONTENT, not a path list, so a fifth screen adopting the constant inherits
# the notice instead of silently escaping it. NOTICE ONLY — see the decision table row.
CLEARANCE_TOUCHED=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    *CollapsibleCrisisButton.tsx) CLEARANCE_TOUCHED=1 ;;
    *) [ -f "$f" ] && grep -q 'CRISIS_FAB_CLEARANCE' "$f" 2>/dev/null && CLEARANCE_TOUCHED=1 ;;
  esac
done <<< "$RENDER_BOOT_RELEVANT"
if [ -n "$CLEARANCE_TOUCHED" ]; then
  echo "📐 A CRISIS_FAB_CLEARANCE surface changed — the acknowledge/decline control's"
  echo "   corner shares screen space with the crisis FAB's touch band. The tagged suite"
  echo "   runs at 375x667, where the bottom safe-area inset is 0 and the two are disjoint"
  echo "   at EVERY clearance value, so it cannot falsify this. NOT added. Validate on a"
  echo "   booted 393x852 device: npm run e2e:safety:reconsent-ineligible-fab"
fi
# INFRA-184: app.json / Info.plist changes are caught by the precommit jest static-config
# test (lsApplicationQueriesSchemes.config.test.ts); no Maestro flow runs here. The device-
# only crisis-988-dial.yaml is tagged safety-device-only and not part of the sim suite.
#
# Boot/render-critical security service: only EncryptionService / SecureStorageService
# survive the RENDER_BOOT_RELEVANT carve-out above (wellness data decrypts at assessment
# render; encryption init gates app boot) → crisis-button boot/render smoke. Every OTHER
# core/services/security change (monitoring / metrics / network / protocol) was stripped
# from RENDER_BOOT_RELEVANT and is jest-owned — see the MAINT-237 narrowing note above.
# TRADEOFF (unchanged): if such a change ALSO touches assessment persistence, run
# `npm run e2e:safety` (full suite) manually.
echo "$RENDER_BOOT_RELEVANT" | grep -qE 'src/core/services/security' && \
  FLOWS+=("crisis-button-reachability")
# --- `.maestro/` flow edits + e2eSeed.ts: this gate's OWN contract surface ---
# An edited flow is validated by running that flow. Three cases the obvious mapping
# gets wrong, which is why this is a case statement and not a name transform:
#   • `_`-prefixed files are helper subflows, not flows. Their blast radius is their
#     transitive `runFlow:` caller set, computed below (INFRA-517) — NOT the whole suite.
#   • daily-loop-*.yaml have their own arms (INFRA-509). A scoped npm script is NOT what
#     makes a flow reachable — INFRA-483 made FLOWS hold FLOW NAMES, and e2e-safety.sh
#     accepts a bare basename, rejecting only `_*` and files that do not exist. ONE
#     exception: daily-loop-ax5-entry.yaml (DEBUG-469) is excluded for a DIFFERENT reason —
#     it is safety-dynamic-type, so the suite can neither select nor validly run it — and
#     it gets an instruction arm below, like 988's.
#   • crisis-988-dial.yaml is tagged safety-device-only and CANNOT pass in the sim:
#     canOpenURL returns false unconditionally there regardless of the array's
#     contents. Adding it would make every 988-flow edit an unfixable red gate, so it
#     is deliberately excluded and surfaced as a hardware instruction instead.
# --- INFRA-517: a helper subflow gates its CALLERS, not the whole suite ---
# Measured on the INFRA-494 close: a `_legal-and-onboarding.yaml` diff ran all 12 sim
# flows, and that helper is included by exactly two — both `safety-device-only` — so not
# one of the 12 could observe it. `runFlow:` is a static per-file include, not an ambient
# graph, so a helper's blast radius IS its transitive caller set. FEAT-376's barrel caveat
# does NOT transfer: a barrel enlarges every importer's graph implicitly, an include needs
# a line in the including flow. `crisis` cleared this on three preconditions, each of
# which fails to FULL_SUITE rather than to a narrow scope:
#   • no `app/.maestro/config.yaml` — its onFlowStart/onFlowComplete/flows: hooks reach
#     EVERY flow with no `runFlow:` line anywhere, which voids caller-derivation outright;
#   • the matcher provably still fires (DEBUG-390: a narrowed matcher that silently
#     matches nothing is indistinguishable from a clean answer);
#   • the anchored set reconciles against a loose substring set, so PARTIAL matcher death
#     — 3 callers found where 11 exist — cannot pass as a legitimately narrow scope. That
#     is the fail-safe that matters; a zero-callers floor only catches TOTAL death.
E2E_DIR="app/.maestro"
# Its onFlowStart/onFlowComplete/flows: hooks apply to every flow with no `runFlow:` line,
# so caller-derivation is invalid the moment this file exists. None exists today.
if [ -f "$E2E_DIR/config.yaml" ] || [ -f "$E2E_DIR/config.yml" ]; then
  echo "🛡️  $E2E_DIR/config.yaml exists — workspace hooks reach every flow without a"
  echo "    runFlow: line, so helper caller-scoping is not valid. Gating full suite."
  FULL_SUITE=1
fi
# Both `runFlow:` forms: scalar (`- runFlow: x.yaml`, optional ./, quotes, trailing
# comment) and the block form's `file:` key. Zero block-form `file:` keys exist in the
# suite today — every block-form runFlow uses inline `commands:` — so the `file:` half
# matches nothing YET. It is here because a flow written that way tomorrow is a new shape
# matching no existing pattern, the mechanism behind all six Protected-Path instances.
# Do NOT drop it for looking dead.
mflow_anchor() {
  printf '^[[:space:]]*(-[[:space:]]*runFlow:|file:)[[:space:]]*["'"'"']?(\./)?%s["'"'"']?[[:space:]]*(#.*)?$' \
    "$(printf '%s' "$1" | sed 's/[.[\*^$]/\\&/g')"
}
# DEBUG-390 pin: prove the matcher fires BEFORE it narrows anything. Two positives (the
# live crisis-button-reachability.yaml:69 trailing-comment shape, and the block form) and
# the live negative at reconsent-stale.yaml:60, which a bare substring grep miscounts.
mflow_matcher_ok() {
  local re; re="$(mflow_anchor "_seeded-home.yaml")"
  printf '%s\n' '- runFlow: _seeded-home.yaml # INFRA-217: e2e-sim seeds onboarding; start at home' | grep -qE "$re" || return 1
  printf '%s\n' '    file: _seeded-home.yaml' | grep -qE "$re" || return 1
  printf '%s\n' '# build. Deliberately NOT `runFlow: _seeded-home.yaml` — that helper waits on' | grep -qE "$re" && return 1
  return 0
}
# Unioned over MERGE_BASE and the working tree: head alone drops a flow on the very close
# that DELETES its last `runFlow:` line — the close most likely to have broken something.
mflow_callers() {
  local re; re="$(mflow_anchor "$1")"
  { grep -lE "$re" "$E2E_DIR"/*.yaml 2>/dev/null | sed 's|.*/||'
    [ -n "${MERGE_BASE:-}" ] && git grep -lE "$re" "$MERGE_BASE" -- "$E2E_DIR/*.yaml" 2>/dev/null | sed 's|.*/||'
  } | sort -u
}
# Superset reconciliation. A line naming the helper that is neither an anchored include
# nor inside a comment is residue the matcher could not classify — fail closed on it.
# Deliberately awk-FREE. awk cannot reference a whole record without `$0`, and the harness
# substitutes `$0` with this run's arguments when rendering the file — so an awk form here
# evaluates `INFRA-nnn` as arithmetic, returns 0 for every line, and this fail-safe silently
# never fires. Same trap as the RENDER_BOOT_RELEVANT note above; there it drops files from
# the gated set, here it disables the reconciliation. Both fail toward NOT gating.
mflow_residue() {
  local base="$1" re f n line stripped
  re="$(mflow_anchor "$base")"
  for f in "$E2E_DIR"/*.yaml; do
    [ -e "$f" ] || continue
    n=0
    while IFS= read -r line; do
      n=$((n + 1))
      case "$line" in *"$base"*) ;; *) continue ;; esac
      printf '%s\n' "$line" | grep -qE "$re" && continue
      stripped="${line%%#*}"
      case "$stripped" in *"$base"*) printf '%s:%d\n' "$f" "$n" ;; esac
    done < "$f"
  done
}
# Visited set + bounded depth. crisis-keyboard-accessory includes BOTH helpers today, and
# nothing prevents a helper including a helper. A blown cap prints __DEPTH__ and gates the
# suite; it never terminates silently.
mflow_closure() {
  local frontier="$1" visited="" depth=0 next item cal
  while [ -n "$frontier" ] && [ "$depth" -lt 10 ]; do
    next=""
    for item in $frontier; do
      case " $visited " in *" $item "*) continue ;; esac
      visited="$visited $item"
      for cal in $(mflow_callers "$item"); do
        case " $visited $next " in *" $cal "*) continue ;; esac
        next="$next $cal"
      done
    done
    frontier="$next"; depth=$((depth + 1))
  done
  [ -n "$frontier" ] && { echo "__DEPTH__"; return; }
  printf '%s\n' $visited
}
mflow_tag() { awk '/^tags:/{f=1;next} /^[^ -]/{f=0} f{gsub(/[ -]/,"");print;exit}' "$E2E_DIR/$1" 2>/dev/null; }
# Every flow name carrying a case arm below. Kept beside the case deliberately: BOTH drift
# directions are loud — a name here with no arm falls to the named catch-all, an arm with
# no name here is reported as unmapped by the drift printer after the loop.
MAPPED_FLOWS="crisis-988-dial reconsent-stale-ineligible-fab-clearance daily-loop-ax5-entry
journal-record-liveness profile-voice-reflection-xxxl q9-single-alert phq9-severe-completion gad7-severe
crisis-button-reachability journal-crisis-scan daily-loop-quick-depth daily-loop-deeplink
deeplink-consent-gate reconsent-stale-ineligible reconsent-stale crisis-keyboard-accessory
guidance-suppressed-handoff guidance-gentle-tier-cap"
MAESTRO_CHANGED="$(echo "$RENDER_BOOT_RELEVANT" | grep -E '\.maestro/.*\.yaml$' || true)"
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$(basename "$f")" in
    _*.yaml)
      HELPER="$(basename "$f")"
      if ! mflow_matcher_ok; then
        echo "🛡️  $HELPER: the include matcher failed its own self-test — gating full suite."
        echo "    (DEBUG-390: a matcher that stops firing looks exactly like a clean scope.)"
        FULL_SUITE=1
      elif [ -n "$(mflow_residue "$HELPER")" ]; then
        echo "🛡️  $HELPER is named on non-comment lines the matcher did not classify:"
        mflow_residue "$HELPER" | sed 's/^/       /'
        echo "    The caller set cannot be proven complete — gating full suite."
        FULL_SUITE=1
      else
        HELPER_CLOSURE="$(mflow_closure "$HELPER")"
        case "$HELPER_CLOSURE" in
          *__DEPTH__*)
            echo "🛡️  $HELPER: include closure exceeded depth 10 (cycle?) — gating full suite."
            FULL_SUITE=1 ;;
          *)
            HELPER_SIM=""; HELPER_OTHER=""
            for c in $HELPER_CLOSURE; do
              case "$c" in _*) continue ;; esac
              if [ "$(mflow_tag "$c")" = "safety" ]; then HELPER_SIM="$HELPER_SIM ${c%.yaml}"
              else HELPER_OTHER="$HELPER_OTHER $c"; fi
            done
            if [ -z "$HELPER_SIM$HELPER_OTHER" ]; then
              echo "🛡️  $HELPER has no runFlow: caller in either tree — gating full suite."
              echo "    (A renamed or newly-added helper lands here by construction.)"
              FULL_SUITE=1
            else
              for s in $HELPER_SIM; do FLOWS+=("$s"); done
              if [ -n "$HELPER_OTHER" ]; then
                echo "📱 $HELPER is included by callers this gate CANNOT run:"
                for c in $HELPER_OTHER; do printf '      • %s (%s)\n' "$c" "$(mflow_tag "$c")"; done
                echo "   This close does NOT verify them. That is a recorded gap, not a pass."
              fi
              if [ -z "$HELPER_SIM" ]; then
                echo "   No sim flow includes $HELPER, so nothing here can observe this edit."
                case "$HELPER" in
                  _legal-and-onboarding.yaml)
                    echo "   ⚠️  This helper carries a RECORDED, NOT FIXED crisis mis-tap"
                    echo "       (INFRA-494, its lines 133-180): legal-gate-continue sits INSIDE"
                    echo "       the ScrollView while the 988 footer is pinned outside it, so the"
                    echo "       tap can land on legal-gate-crisis-988. It runs ONLY on hardware."
                    echo "       Attend a device session before merging:"
                    echo "         npm run e2e:safety:988-dial   (with an iPhone connected)" ;;
                esac
                echo "   The Step 2.5.3 net below still runs crisis-button-reachability."
              fi
            fi ;;
        esac
      fi ;;
    crisis-988-dial.yaml)
      echo "📱 crisis-988-dial.yaml changed — safety-device-only. The sim's canOpenURL"
      echo "   returns false unconditionally, so this flow cannot pass here and is NOT"
      echo "   added to the run set. Validate on real hardware before merging:"
      echo "   npm run e2e:safety:988-dial (with an iPhone connected)." ;;
    reconsent-stale-ineligible-fab-clearance.yaml)
      echo "📐 reconsent-stale-ineligible-fab-clearance.yaml changed — safety-bottom-inset."
      echo "   It declares 393x852 and the suite's target is 375x667, where the collision"
      echo "   it adjudicates cannot occur at any clearance value. NOT added, and NOT a"
      echo "   full-suite trigger. Validate it directly on a booted 393x852 device:"
      echo "   npm run e2e:safety:reconsent-ineligible-fab" ;;
    daily-loop-ax5-entry.yaml)
      echo "🔠 daily-loop-ax5-entry.yaml changed — safety-dynamic-type. The tagged suite"
      echo "   selects on an exact \`- safety\` tag and runs at the DEFAULT content size,"
      echo "   so it can neither select this flow nor validly run it. NOT added, and"
      echo "   deliberately NOT a full-suite trigger. Validate it directly:"
      echo "   npm run e2e:safety:ax5" ;;
    journal-record-liveness.yaml)
      echo "🎙️  journal-record-liveness.yaml changed — safety-host-probe. It drives to"
      echo "   phase:'recording' and STOPS; the verdict is the host-side pid sample either"
      echo "   side of a MEASURED dwell, which no Maestro assertion can express. Running"
      echo "   this flow bare proves only that the record tap landed. NOT added to the run"
      echo "   set, and NOT a full-suite trigger. Validate it directly:"
      echo "   npm run e2e:safety:audio-liveness" ;;
    profile-voice-reflection-xxxl.yaml)
      echo "🔠 profile-voice-reflection-xxxl.yaml changed — safety-dynamic-type, same"
      echo "   carve-out as ax5 above. Note the SIZE differs: this one runs at"
      echo "   extra-extra-extra-large (largest NON-accessibility step) via"
      echo "   E2E_DYNAMIC_TYPE_SIZE, not the wrapper's AX5 default. Validate it directly:"
      echo "   npm run e2e:safety:xxxl" ;;
    q9-single-alert.yaml)            FLOWS+=("q9-single-alert") ;;
    phq9-severe-completion.yaml)     FLOWS+=("phq9-severe-completion") ;;
    gad7-severe.yaml)                FLOWS+=("gad7-severe") ;;
    crisis-button-reachability.yaml) FLOWS+=("crisis-button-reachability") ;;
    journal-crisis-scan.yaml)        FLOWS+=("journal-crisis-scan") ;;
    daily-loop-quick-depth.yaml)     FLOWS+=("daily-loop-quick-depth") ;;
    daily-loop-deeplink.yaml)        FLOWS+=("daily-loop-deeplink") ;;
    deeplink-consent-gate.yaml)      FLOWS+=("deeplink-consent-gate") ;;
    reconsent-stale-ineligible.yaml) FLOWS+=("reconsent-stale-ineligible") ;;
    reconsent-stale.yaml)            FLOWS+=("reconsent-stale") ;;
    crisis-keyboard-accessory.yaml)
      echo "⌨️  crisis-keyboard-accessory.yaml changed — safety-device-only. Its keyboard"
      echo "   accessory assertions need real hardware; NOT added to the run set."
      echo "   Validate directly with a device connected." ;;
    guidance-suppressed-handoff.yaml) FLOWS+=("guidance-suppressed-handoff") ;;
    guidance-gentle-tier-cap.yaml) FLOWS+=("guidance-gentle-tier-cap") ;;
    # INFRA-517: still the full suite — an unmapped flow is a shape nobody has reasoned
    # about, and the INFRA-428 asymmetry says bias safe. But NAME it: a silent cap reads
    # exactly like a deliberate scope, and this arm was quietly absorbing real drift.
    *)
      echo "🛡️  unmapped flow $(basename "$f") — no case arm, gating full suite."
      echo "    Give it an arm (and add it to MAPPED_FLOWS) to scope it properly."
      FULL_SUITE=1 ;;
  esac
done <<< "$MAESTRO_CHANGED"
# INFRA-517 drift printer. Runs whenever the loop ran at all, not only on a catch-all hit:
# an arm set that only reports drift for files someone happens to edit is not a check.
if [ -n "$MAESTRO_CHANGED" ]; then
  # Collapse the newlines out of MAPPED_FLOWS first: the membership test is
  # space-delimited, so a name sitting at a line break would never match itself.
  MAPPED_NORM=" $(echo $MAPPED_FLOWS) "
  for ff in "$E2E_DIR"/[!_]*.yaml; do
    [ -e "$ff" ] || continue
    nn="$(basename "$ff" .yaml)"
    case "$MAPPED_NORM" in *" $nn "*) ;; *)
      echo "⚠️  arm-set drift: $nn.yaml is present with no case arm (falls to full suite)." ;;
    esac
  done
  for nn in $MAPPED_FLOWS; do
    [ -e "$E2E_DIR/$nn.yaml" ] || echo "⚠️  arm-set drift: case arm \`$nn\` names no file in $E2E_DIR."
  done
fi
# e2eSeed sets the launch state EVERY flow starts from, so no narrower scope is valid.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/core/config/e2eSeed\.ts' && FULL_SUITE=1

# core/navigation (incl. CleanRootNavigator) is genuinely cross-cutting UI/nav — a
# tab/stack re-point can break ANY flow's reachability. Keep the full suite, LAST so
# this replace-override wins over the += clauses above when combined.
echo "$RENDER_BOOT_RELEVANT" | grep -qE 'src/core/navigation/|CleanRootNavigator' && \
  FULL_SUITE=1  # full suite — cross-cutting change, override scope
# FULL_SUITE wins over every += above. Step 2.5.5 ignores FLOWS when it is set and runs
# `e2e-safety.sh` with NO arguments, which is how the tagged suite is selected.
[ -n "$FULL_SUITE" ] && FLOWS=()

# Safety net / clean-skip split: if nothing mapped, decide WHY via RENDER_BOOT_RELEVANT.
#  • render/boot-relevant change we failed to map → fail SAFE to crisis-button (never
#    enter the gate on a render/boot change and run zero flows).
#  • ONLY service-layer carve-outs changed → deliberate, LOGGED skip (no silent cap):
#    jest owns the surface; no sim build needed (this is the MAINT-237 narrowing payoff).
if [ ${#FLOWS[@]} -eq 0 ] && [ -z "$FULL_SUITE" ]; then
  if [ -n "$RENDER_BOOT_RELEVANT" ]; then
    FLOWS=("crisis-button-reachability")
  else
    echo "ℹ️  Safety-surface change is SERVICE-LAYER ONLY (MAINT-237 narrowing) — no sim flow:"
    echo "$SAFETY_CHANGED" | sed 's/^/      /'
    echo "    The sim flows only validate render/boot/nav; this change touches none. jest"
    echo "    crisis/clinical/security/encryption suites + CollapsibleCrisisButton render"
    echo "    tests (precommit + CI) own it. Proceeding to close with no sim build."
  fi
fi

# Dedupe (only when non-empty — a clean service-layer skip leaves FLOWS intentionally empty)
[ ${#FLOWS[@]} -gt 0 ] && FLOWS=($(printf "%s\n" "${FLOWS[@]}" | sort -u))
```

### Step 2.5.3a: Hand off, or stay attached (INFRA-492)

Everything from Step 2.5.4 to Step 3.8 is mechanical **given the classification just
made** — and is also the 5–35 minute block that holds this session. `app/scripts/b-close-run.sh`
runs exactly that span detached, so serialised closes cost wall-clock instead of costing a
human twice. Serialisation itself is unchanged: the runner invokes the same gate and suite
entry points, so the INFRA-436/463/472 leases still queue it.

**Do NOT detach when any of these hold** — in each case a human is the point:

| Condition | Why it stays attached |
|---|---|
| `Batch Route: Attended-only` | The item's ACs require human observation. The runner cannot read Notion, so this check only exists here. |
| The branch is `hotfix/*` | The one branch class where `--skip-e2e` and `--no-verify` are permitted; a hotfix is by definition being watched. |
| A multi-slice item's non-final slice | Step 4.1/5.1 would misreport state anyway (see this file's header). |
| The worktree is dirty | The runner does not commit. Phase 2 must have landed everything first. |

Otherwise offer the handoff — but only if **this worktree** has the runner. Same
capability gate as Step 0.0 and for the same reason: this file is shared instantly,
`app/scripts/` is not. `npm run close:detached` absent ⇒ say so and stay attached.

The item's Notion `Batch Route` is read in Phase 1 — if it was not, read it now rather
than assuming.

```bash
cd /Users/max/dev/being/[worktree-dir]/app
# The PR body must exist as a file BEFORE launching, and must NOT live in the worktree:
# e2e-provenance.js fingerprints untracked file contents repo-wide, so a draft there reads
# as MISMATCH and costs a rebuild. Write it to the session scratchpad.
nohup npm run --silent close:detached -- \
  --worktree /Users/max/dev/being/[worktree-dir] \
  --branch   [feature-branch-name] \
  --item     [WORK_ITEM_ID] \
  --title    "[type]: [WORK_ITEM_ID] [Name from Notion]" \
  --body-file [scratchpad]/pr-body.md \
  --flows    "${FLOWS[*]}" \
  >/dev/null 2>&1 &
disown
```

Pass `--full-suite` instead of `--flows` for a cross-cutting change, and `--no-flows` for
the service-layer-only skip Step 2.5.3 logs. One of the three is required — an omitted
flow argument is refused rather than silently treated as "no flows".

**The `nohup` is the whole detachment, and it happens exactly once.** Inside the runner
every child is foreground, because the safety suite must never be a reap-able background
task: a killed run takes the XCUITest driver with it and reports `Unknown error` with
`ConnectException` only in `maestro.log`, indistinguishable from a regression (CLAUDE.md).
Never launch the suite itself with `&`, and never re-detach the runner.

Then **stop** — do not fall through to 2.5.4. Report the run directory, tell the operator
to read `npm run close:status`, leave Notion `In progress`, and end the session. Phase 4
belongs to whoever acknowledges the result.

Staying attached is always valid and is the default when anything above is unclear.

---

### Step 2.5.4: Verify simulator readiness

**The sync happened in Step 2.5.0.** Two consequences land here: it gets you INFRA-383's
fast build, since `e2e-sim-build.sh` is app code that arrives with the back-merge; and
`git merge` does not fire the pre-commit hook, so run `npm run precommit` against the
merged tree before spending a build on it.

If `development` advances again WHILE you gate, re-classify rather than re-gate
reflexively: re-run the flows only when the newly merged work touches a Step 2.5.1
safety path. Unrelated churn does not invalidate a passing gate, and re-gating on
every dev merge does not terminate on a busy day.

**SECOND — is this worktree's build script the new one?** `.claude/` is shared across every
worktree (it lives on `_bare`), but `app/scripts/e2e-sim-build.sh` is **app code**, so it
arrives only when INFRA-383 is on *this branch*. Until a branch back-merges `development`,
the guidance below describes a build that worktree cannot produce. Detect it rather than
letting the operator discover it 12 minutes in:

```bash
# INFRA-483: FULL_SUITE means "run the tagged suite with no arguments", so an empty
# FLOWS[] does NOT mean "no flows" — check both or a cross-cutting change skips the
# readiness guards entirely and enters the gate with no simulator.
if [ ${#FLOWS[@]} -gt 0 ] || [ -n "$FULL_SUITE" ]; then
  if ! grep -q 'INFRA-383' app/scripts/e2e-sim-build.sh 2>/dev/null; then
    echo "⚠️  This worktree still has the LEGACY EAS gate build (pre-INFRA-383)."
    echo "    'npm run e2e:safety:build' here = eas build --local: 10-15 min EVERY run,"
    echo "    and it additionally requires eas-cli logged in + fastlane + a clean tree."
    echo ""
    echo "    To get the 1-4 min incremental Release build, back-merge development first:"
    echo "      git merge origin/development"
    echo "    Then re-read app/scripts/e2e-sim-build.sh's header before building."
    echo ""
    echo "    If app/ios/Podfile.lock checksums shift in that merge, do the pod-deintegrate"
    echo "    sequence in CLAUDE.md 'Known Gotchas' or the sim build will fail with"
    echo "    [runtime not ready]: ReferenceError: Property 'MessageQueue' doesn't exist."
    echo ""
    echo "    Proceeding on the legacy path is FINE — it produces a valid gate target."
    echo "    This is a heads-up about time and prereqs, not a blocker."
  fi
fi
```

Not a hard stop, deliberately. The legacy EAS build still produces a correct, launcher-free
Release artifact — it is only slow and has more prereqs. Blocking a close over it would
convert a papercut into an outage. Delete this guard once every active branch carries
INFRA-383.


The gate requires a **Release** build on the sim, NOT `npm run ios` (Debug).
`npm run e2e:safety:build` produces and installs it — since INFRA-383 that is
`expo run:ios --configuration Release`: 1–4 min warm, but 11–14 min whenever the
native project regenerates (INFRA-508). Skipping it is still not justified; budget
for the regenerating tier rather than the warm one.

**Prefer `npm run e2e:safety:gate` (INFRA-436), and mind the ordering.** A plain
`e2e:safety:build` in *this* worktree pays a **cold** build — measured **21m31s**, not the
~14 min previously documented — because Xcode keys DerivedData by workspace path and
`/b-work` gives every item a fresh worktree. `e2e:safety:gate` builds the same artifact in
one shared, warm gate worktree (~90 s) and then verifies, from *this* worktree, that the
installed binary corresponds to *this* tree. Evidence semantics are unchanged: the
provenance marker is content-addressed, so the artifact is bound to the commit, not to the
directory it was built in.

The ordering is not optional and follows directly from the paragraph above:

```
git merge origin/development     # 1. back-merge HERE, in the item's worktree
npm run precommit                # 2. `git merge` does not fire the pre-commit hook
npm run e2e:safety:gate          # 3. gate worktree detaches at the RESULTING commit
```

**INFRA-483 — run step 3 from here and ROUTE ON ITS EXIT CODE.** This used to be prose
plus the example block above, so `e2e:safety:gate` was never actually invoked by this step
and INFRA-472's lease-contention exit code reached no decision point at all. Exit **4** is
the one that matters: it means a peer session holds the gate slot, which says nothing about
this item. Reporting it as a gate failure would park a healthy branch and, repeated, is
exactly the pressure that produces `--skip-e2e`.

```bash
if [ ${#FLOWS[@]} -gt 0 ] || [ -n "$FULL_SUITE" ]; then
  npm run e2e:safety:gate
  GATE_RC=$?
  case "$GATE_RC" in
    0) : ;;   # artifact built and provenance-bound to this tree — continue to 2.5.5
    4) # INFRA-472: the pair lease (gate worktree + simulator) is held elsewhere. The
       # wrapper has already named the holding pid on stderr — surface it, do not
       # re-derive it, and NEVER identify the holder with pgrep -f (DEBUG-392).
       echo "⏸️  Gate slot busy (exit 4) — a peer session holds the gate worktree +"
       echo "    simulator lease. This is CONTENTION, not a regression and not a gate"
       echo "    failure: nothing has been learned about this branch either way."
       echo "    Wait for the holder named above and re-run /b-close. Do NOT --skip-e2e,"
       echo "    and do NOT record this as a red gate."
       exit 1 ;;
    *) echo "❌ e2e:safety:gate failed (exit $GATE_RC) — the gate artifact could not be"
       echo "   produced or does not correspond to this tree. Fix before closing."
       exit 1 ;;
  esac
fi
```

A caller that parks or tiers on close failures — `/b-batch` Phase 3.4 is the one in
tree — must read exit 4 as "retry later", never as a CI-red or a safety regression.

**Exit 0 here does not reserve the simulator for 2.5.5.** The lease spans the build only
(`e2e-gate.sh`), so a peer parked in `e2e_lock_acquire` takes the device the instant the
build releases and installs over the attested binary — 2.5.5 then refuses on provenance
`MISMATCH`. That refusal is correct; retry both steps when the machine is quiet. Holding
the pair in an outer shell does NOT work around it: `e2e-gate.sh` assigns rather than
appends to `E2E_LOCK_INHERITED`, so the build deadlocks on its own ancestor's lease.

Pointing the gate at a bare branch tip gates a tree that will never merge — the same
mistake this step's "sync FIRST" rule exists to prevent, just relocated. The wrapper
refuses a dirty worktree up front and names the offending files, and on any provenance
mismatch `e2e-provenance.js explain` now names the files responsible rather than emitting a
bare `MISMATCH` (INFRA-436).

**Corrected (INFRA-383).** This paragraph used to say a plain
`--configuration Release` build also ships the dev launcher and that only the EAS
`e2e-sim` profile removes it. That was false — Expo autolinking marks
`expo-dev-launcher` `debugOnly: true`, so no Release build links it, and EAS's
`developmentClient:false` only *defaults* `buildConfiguration`, which `e2e-sim`
already set to Release explicitly. Do not reinstate the claim.

**Provenance (INFRA-384) — this step no longer merely *guides*.** It used to say outright
that the `listapps` check "can't tell which build is installed, so this is guidance, not
enforcement", which meant a green gate proved only that *some* Being build was installed.
`e2e-sim-build.sh` now writes a marker inside the installed container binding it to the
tree it was built from, and `e2e-safety.sh` refuses every flow when that marker is absent
or stale — so the check below is a real gate on artifact LINEAGE, alongside INFRA-383's
existing asserts on artifact SHAPE.

The verify is **capability-gated** on the helper existing, mirroring the INFRA-383 grep
guard above and for the same reason: `.claude/` is shared by every worktree the instant it
is committed, but `app/scripts/` is app code that only arrives on branches that have
back-merged `development`. Without the guard, every open feature branch's close breaks.

```bash
# Only require a simulator when there are flows to run. A service-layer-only safety
# change (Step 2.5.3) resolves to zero flows and closes with no sim build at all.
if [ ${#FLOWS[@]} -gt 0 ] || [ -n "$FULL_SUITE" ]; then
  if ! xcrun simctl list devices booted | grep -qE '\([A-F0-9-]+\) \(Booted\)'; then
    echo "❌ No iOS simulator booted."
    echo "   Run 'npm run e2e:safety:build' first (Release build, INFRA-383) to build +"
    echo "   install Being on a sim, then retry /b-close. Do NOT use 'npm run ios' (Debug → dev launcher → gate refuses)."
    exit 1
  fi
  # Bundle id is fyi.being.app (MAINT-161). It is NOT com.being.app — that target
  # was claimed by a third party and retired, and this guard used to grep for it,
  # so it failed closed on any machine without a stale pre-MAINT-161 build lying
  # around, and passed by accident on machines that had one. Keep this string in
  # sync with `appId:` in app/.maestro/*.yaml — they must name the same app or the
  # guard greenlights a suite that cannot launch anything.
  if ! xcrun simctl listapps booted 2>/dev/null | grep -q fyi.being.app; then
    echo "❌ fyi.being.app not installed on booted sim."
    echo "   Run 'npm run e2e:safety:build' first (Release build, INFRA-383), then retry /b-close."
    exit 1
  fi

  # INFRA-384 — is the installed binary actually built from THIS tree?
  # Capability-gated: branches that predate INFRA-384 have no helper and keep the old
  # behaviour rather than failing to close.
  # Resolve from the repo toplevel, NOT relative to $PWD: if the shell is already inside
  # app/ the relative form silently misses the helper, prints "predates INFRA-384", and
  # skips enforcement — a capability guard that fails OPEN.
  WT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
  if [ -f "$WT_ROOT/app/scripts/e2e-provenance.js" ]; then
    APP_CONTAINER="$(xcrun simctl get_app_container booted fyi.being.app 2>/dev/null || true)"
    VERDICT="$( cd "$WT_ROOT/app" && node scripts/e2e-provenance.js verify "$APP_CONTAINER" 2>/dev/null )" || true
    case "$VERDICT" in
      MATCH_CLEAN)
        echo "✓ provenance: gate target built from this exact tree, clean"
        ;;
      MATCH_DIRTY)
        # What merges is the COMMIT, so the binary must correspond to one. This is the
        # enforcement this step previously admitted it could not do.
        echo "❌ The gate target was built from a DIRTY tree — not merge evidence."
        echo "   Commit your changes and rebuild: npm run e2e:safety:build"
        exit 1
        ;;
      *)
        echo "❌ provenance ${VERDICT:-<no verdict>} — the installed binary was not built"
        echo "   from the current tree (or carries no marker). Rebuild: npm run e2e:safety:build"
        exit 1
        ;;
    esac
  else
    echo "ℹ️  This branch predates INFRA-384 — no provenance helper, so the installed"
    echo "    binary's lineage is unverified. Back-merge development, or rebuild before"
    echo "    trusting the gate."
  fi
fi
```

Do NOT auto-boot or auto-build — these are multi-minute detours mid-close. Defer
to the user.

### Step 2.5.5: Run the scoped flows

```bash
cd /Users/max/dev/being/[worktree-dir]/app
if [ ${#FLOWS[@]} -eq 0 ] && [ -z "$FULL_SUITE" ]; then
  echo "✅ No sim flows required (service-layer-only safety change, Step 2.5.3) — proceeding to close."
else
  # INFRA-384 — a merge gate's evidence must correspond to the commit being merged, so
  # a dirty-tree marker is a FAILURE here even though it is only a banner for a human
  # iterating locally. AC3 and AC4 are opposite policies over one implementation; this
  # variable is the whole difference. Set here as well as checked in 2.5.4 because
  # e2e-safety.sh re-verifies at run time — the tree can move between the readiness
  # check and the flow.
  export E2E_REQUIRE_CLEAN_PROVENANCE=1

  # INFRA-510 — name the receipt so the certification verdict below reads THIS run's file.
  # The default is timestamped and PID-suffixed, so a reader would have to glob for it and
  # would race every peer gate on the machine. NEVER under the worktree: the provenance
  # fingerprint hashes untracked file contents repo-wide, so a receipt written there reads
  # as MISMATCH on the next verify and costs a rebuild.
  export E2E_RECEIPT_PATH="${TMPDIR:-/tmp}/being-close-receipt-$$.txt"

  # INFRA-483 — ONE invocation for the whole scoped set. This used to loop `npm run` per
  # flow; the simulator lease is acquired and released per PROCESS (e2e-safety.sh:266-267),
  # so N flows meant N-1 windows in which a peer's gate build could install over the target
  # and fail the next flow's pre-flight, discarding the flows that had already passed.
  # It also restores INFRA-434's mid-suite substitution watch, which re-reads the provenance
  # marker's bytes between flows WITHIN one invocation — one flow per process made every
  # flow a one-flow "suite" and left it nothing to watch.
  if [ -n "$FULL_SUITE" ]; then
    echo "🛡️  Running the full safety suite (cross-cutting change)"
    bash scripts/e2e-safety.sh
  else
    echo "🛡️  Running ${#FLOWS[@]} scoped flow(s): ${FLOWS[*]}"
    bash scripts/e2e-safety.sh "${FLOWS[@]}"
  fi
  E2E_RC=$?

  # Exit alphabet is e2e-safety.sh's, not this file's. Do not collapse these arms: 2 and 3
  # are NOT regressions, and reporting them as one trains a reflex to re-run or bypass.
  case "$E2E_RC" in
    0) echo "✅ All scoped Maestro safety flows passed" ;;
    1) echo "❌ A Maestro safety flow FAILED — this is a regression."
       echo "   Fix it, or — on a hotfix/* branch only — re-run with --skip-e2e."
       echo "   Debug a single flow with: maestro test .maestro/<flow>.yaml --debug"
       exit 1 ;;
    2) echo "❌ The gate harness could not complete (exit 2) — NOT a flow regression."
       echo "   No verdict was produced, so this is neither a pass nor a failure."
       echo "   READ THE MESSAGE before re-running: since DEBUG-505 this code also carries"
       echo "   invocation errors and pre-flight refusals, most of which are self-clearing"
       echo "   (an unbuilt target needs one build; a stale marker needs a rebuild). Only a"
       echo "   wedged simulator or an unresponsive machine needs diagnosis first."
       exit 1 ;;
    3) echo "❌ The gate TARGET WAS REPLACED mid-suite (exit 3, INFRA-434) — NOT a regression."
       echo "   A peer replaced the installed app, so completed flows are VOID, not PASS."
       echo "   Re-run the whole scoped set once the other session is done."
       exit 1 ;;
    *) echo "❌ e2e-safety.sh exited $E2E_RC — unrecognised. Treat as no verdict."
       exit 1 ;;
  esac

  # --- The SECOND axis of the same run (INFRA-493 AC 7, scoped by INFRA-510) -----------
  # Exit 0 above means every requested flow was GREEN. It does not mean the run is merge
  # evidence: a flow declaring 375x667 that ran on 402x874 reports UNCERTIFIED and still
  # exits 0, because the exit alphabet is frozen at 0/1/2/3 and expressing this as a new
  # status is the category error INFRA-478's AC 2(a) forbade. The verdict is in the receipt.
  #
  # SCOPED TO THE FLOWS THIS CLOSE REQUESTED, never the run-level `certification:` line.
  # The suite carries more than one certifying target and `e2e_resolve_sim_device` pins ONE
  # device, so no device yields a run-level CERTIFIED over everything; refusing on that line
  # would refuse every FULL_SUITE close, and the documented response to an unsatisfiable
  # gate is `--skip-e2e` habit. FULL_SUITE requests everything, so it passes no names and
  # the predicate intersects against the whole set.
  #
  # Resolved from the REPO ROOT, never $PWD: this block runs with the shell already inside
  # `app/`, and a capability guard written relative to $PWD fails OPEN there.
  CERT_HELPER="$(git rev-parse --show-toplevel)/app/scripts/b-close-verdict.sh"
  if [ ! -r "$CERT_HELPER" ]; then
    echo "ℹ️  This branch predates INFRA-510 — no certification verdict to read."
  else
    # shellcheck source=/dev/null
    . "$CERT_HELPER"
    if [ -n "$FULL_SUITE" ]; then
      CERT_WORD="$(b_close_certification_verdict "$E2E_RECEIPT_PATH")"
      CERT_FLOWS="$(b_close_uncertified_intersection "$E2E_RECEIPT_PATH")"
    else
      CERT_WORD="$(b_close_certification_verdict "$E2E_RECEIPT_PATH" "${FLOWS[@]}")"
      CERT_FLOWS="$(b_close_uncertified_intersection "$E2E_RECEIPT_PATH" "${FLOWS[@]}")"
    fi
    CERT_VERDICT="$(b_close_stage_verdict certification "$CERT_WORD")"
    CERT_RAN="$(sed -n 's/^device_viewport:[[:space:]]*//p' "$E2E_RECEIPT_PATH" 2>/dev/null | head -1)"
    CERT_UDID="$(sed -n 's/^device_udid:[[:space:]]*//p' "$E2E_RECEIPT_PATH" 2>/dev/null | head -1)"
    if b_close_mergeable "$CERT_VERDICT"; then
      echo "✅ Certification: every requested flow certified its declared viewport (ran ${CERT_RAN:-?})"
    else
      echo "❌ $CERT_VERDICT — this run is green but does NOT certify what it ran."
      case "$CERT_VERDICT" in
        UNCERTIFIED_FLOW)
          echo "   Did not certify on ${CERT_RAN:-an underivable viewport}: $CERT_FLOWS"
          echo "   Each flow's declared target is in the receipt's results: lines."
          echo "   Boot the declared device (a viewport is not bootable; a model is), then"
          echo "   shut this one down — the gate refuses at 2+ booted:"
          echo "     xcrun simctl shutdown ${CERT_UDID:-<current-udid>}"
          echo "     xcrun simctl boot 'iPhone SE (3rd generation)'   # 375x667" ;;
        CERT_VOID)
          echo "   The gate target moved mid-suite (INFRA-434), so no flow is vouched for." ;;
        CERT_NO_RECEIPT)
          echo "   No receipt at $E2E_RECEIPT_PATH. Absence of evidence is a refusal here." ;;
        *)
          echo "   Unrecognised certification token '$CERT_WORD' — treat as no verdict." ;;
      esac
      echo "   Do NOT add a bypass flag; --skip-e2e stays hotfix-only."
      echo "   Receipt: $E2E_RECEIPT_PATH"
      exit 1
    fi
  fi
fi
```

Proceed to Step 3.1 only on success.

**Use the wait.** The build (~7 min post-regen, 21 min cold) and the flow run are dead
time on the critical path, and everything downstream is already knowable: draft Step 3.3's
PR body and Step 4.2's Notion comment while they run, so both paste straight in when the
gate goes green. Draft in the scratchpad, never the worktree — an untracked file there
reads as MISMATCH on the next provenance verify and costs a rebuild (CLAUDE.md).

**`development` can advance while the gate runs.** After Phase 2.5 completes, re-check
`git rev-list --count HEAD..origin/development`. If the new commits leave your NET diff
free of runtime code, proceed and record that reasoning — re-gating would validate their
changes, not yours. If your net diff still carries runtime code, re-merge and re-gate.

---

## Phase 3: PR + Merge to Development

**GitHub Flow note** (INFRA-145): `development` branch protection requires PRs.
Direct local-merge-then-push is no longer possible. b-close now opens a PR,
waits for CI, then merges via `gh pr merge`.

### Step 3.1: Sync Feature Branch with origin/development

GitHub branch protection requires "branches up to date before merging." If the
feature branch is behind `origin/development` at merge time, GitHub invalidates
the existing CI checks (treats them as having run against a stale base) and
refuses the merge with `Required status check "CI pass" is expected` — **even
with `--admin`** (admin bypasses approvals but not stale-check invalidation).
Sync locally first so the push in Step 3.2 carries the merge commit and CI
runs once against the correct base.

```bash
cd /Users/max/dev/being/[worktree-dir]
git fetch origin

BEHIND=$(git rev-list --count HEAD..origin/development)
if [ "$BEHIND" -gt 0 ]; then
  echo "🔄 Feature branch is $BEHIND commits behind origin/development; merging..."
  if ! git merge origin/development --no-edit; then
    echo "❌ Merge conflict with origin/development."
    echo "   Resolve conflicts in the worktree, then:"
    echo "     git add <resolved files>"
    echo "     git commit              # accept default 'Merge branch ...' subject"
    echo "     /b-close [WORK_ITEM_ID] # idempotent — re-runs from here"
    exit 1
  fi
  echo "✅ Synced (merge commit created locally; will be pushed in Step 3.2)"
else
  echo "✓ Already up to date with origin/development"
fi
```

**Why local-merge over `gh pr update-branch` post-PR:**
- Surfaces conflicts in the worktree *before* opening a noisy PR.
- One CI cycle instead of two — saves ~3–4 minutes per BEHIND occurrence.
- The push in Step 3.2 carries both the feature commit(s) and the merge
  commit in a single shot.

**A clean merge can still misplace a prose edit.** If Step 3.1's merge touched a file
this branch also edits, re-read your section in the merged file before pushing: git
resolves markdown by line proximity, so an addition anchored to what was the last
paragraph can land mid-section and orphan what follows. No conflict is reported.

---

### Step 3.2: Push Feature Branch

From the feature worktree (where the implementation work happened):

```bash
cd /Users/max/dev/being/[worktree-dir]
git push -u origin [feature-branch-name]
```

**Display**:
```
🚀 Pushed feature branch to origin
   Branch: [feature-branch-name]
```

---

### Step 3.3: Open PR Targeting Development

```bash
gh pr create \
  --base development \
  --head [feature-branch-name] \
  --title "[type]: [WORK_ITEM_ID] [Name from Notion]" \
  --body "$(cat <<'EOF'
Closes [WORK_ITEM_ID]

[Brief description from work item User Story or Acceptance Criteria]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Type-to-prefix mapping** (same as commit message):
- FEAT → `feat:`
- DEBUG → `fix:`
- INFRA/MAINT/AGENT → `chore:`

**Capture PR number** from the output URL (e.g., `https://github.com/MP2EZ/being/pull/42` → PR #42).

**Display**:
```
📬 PR opened: #[PR_NUMBER]
   URL: [PR URL]
   Base: development
   Head: [feature-branch-name]
```

---

### Step 3.4: Wait for CI

**Never use `gh pr checks --watch` alone as the verdict.** It blocks correctly but
its exit status is not trustworthy: a commit can carry both a push-triggered and a
PR-triggered run, and `--watch` can exit reporting all-green having read only one of
them — leaving `gh pr merge` to refuse with `Required status check "CI pass" is
failing` seconds later. `/b-batch` Step 3.4 is the other half of the same fix.

Wait, then verify against the **full rollup**, which is authoritative:

```bash
# (a) Wait for the run to REGISTER. `gh pr checks` exits non-zero when no checks
#     exist yet, and this window is real: CI's `push:` trigger no longer covers
#     feat/*|fix/*|chore/* branches, so Step 3.2's push creates no run and the
#     only run is the one `gh pr create` (Step 3.3) just triggered seconds ago.
#     Poll the ROLLUP, not `gh pr checks`' exit status — they are different sources
#     and disagree in this window, so (a) can fall through to an EMPTY verdict. Same
#     class as the `--watch` warning below: never take the verdict from a second command.
for i in $(seq 1 40); do
  [ "$(gh pr view [PR_NUMBER] --json statusCheckRollup -q '.statusCheckRollup|length')" -gt 0 ] && break
  sleep 5
done

# (b) Block until every check completes. `|| true` because --watch exits non-zero
#     on failure and (c) must still run — (c) is what decides, not this.
gh pr checks [PR_NUMBER] --watch || true

# (c) AUTHORITATIVE verdict — one word: GREEN | RED | EMPTY.
#     `.conclusion // .state` because Actions check-runs carry `.conclusion` while
#     StatusContext rows (non-Actions integrations) carry `.state` — reading only
#     `.conclusion` renders those as literal "null" and reads as permanently red.
#     Deliberately grep-free: `grep -qv` is NOT safe here. Claude Code's shell
#     snapshot aliases `grep` to a ugrep wrapper whose `-q` + `-v` exit status is
#     INVERTED vs system grep (verified: `-qv` on input containing a non-matching
#     line returns 1 via the wrapper, 0 via /usr/bin/grep). A `grep -qv` gate
#     therefore reads a red rollup as green — the exact bug this step exists to
#     stop. Positive `grep -q` is unaffected, which is why the Phase 2.5 path
#     checks above are fine.
gh pr view [PR_NUMBER] --json statusCheckRollup -q '
  [.statusCheckRollup[] | (.conclusion // .state)]
  | if length == 0 then "EMPTY"
    elif all(. == "SUCCESS" or . == "NEUTRAL" or . == "SKIPPED") then "GREEN"
    else "RED" end'

# Human-readable detail, for the failure message:
gh pr view [PR_NUMBER] --json statusCheckRollup \
  -q '.statusCheckRollup[] | "\(.name)\t\(.conclusion // .state)"' | sort
```

Route on (c), never on (b)'s exit code:
- **`GREEN`** → proceed to Step 3.5.
- **`RED`** → CI is red. STOP (see below).
- **`EMPTY`** → no checks registered yet; the (a) wait fell through. Re-run (a)–(c)
  once. Still `EMPTY` → STOP and report; a PR with no checks must never merge,
  because `CI pass` is the sole required context and an empty rollup is
  indistinguishable from "the workflow never triggered".

Expect **one row per gate** now that the duplicate push-triggered run is gone. Two
rows per gate means a second workflow is attaching runs to this commit — a
`CI pass` row green in one and red in the other is exactly the INFRA-329 shape,
and the verdict above correctly returns `RED` for it.

**Display while waiting**:
```
⏳ Waiting for CI (9 strict gates)...
```

**On success**:
```
✅ All CI gates passed (verified against statusCheckRollup, not --watch)
```

**On failure**:
```
❌ CI failed on PR #[PR_NUMBER]
   Failing gate(s): [names from the rollup with a non-SUCCESS conclusion]
   Investigate: [PR URL]/checks

   To re-trigger after a fix:
   1. Push another commit to [feature-branch-name]
   2. Re-run /b-close [WORK_ITEM_ID]
```

(STOP here on failure — do not proceed to merge.)

**Do not route a red gate to a re-sync.** If `gh pr merge` is later refused while
the rollup is all-SUCCESS, *that* is the stale-base case and re-invoking `/b-close`
is correct. A refusal with a `FAILURE` row in the rollup is CI red — a free
`gh run rerun --failed` is the first move, not a re-sync. The two have opposite
fixes; `/b-batch` Step 3.4(a)/(b) has the full routing table.

---

### Step 3.5: Merge via gh pr merge

Use **merge commit** strategy (preserves feature branch history, matches the
prior `--no-ff` behavior). Use `--admin` to bypass the "branch up-to-date with
base" requirement for solo workflow speed.

```bash
gh pr merge [PR_NUMBER] \
  --merge \
  --delete-branch \
  --admin
```

**Display**:
```
✅ Merged PR #[PR_NUMBER] to development
   Strategy: merge commit (preserves feature branch history)
   Feature branch deleted on remote
```

**Capture merge commit SHA**:
```bash
MERGE_SHA=$(gh pr view [PR_NUMBER] --json mergeCommit -q '.mergeCommit.oid')
```

---

### Step 3.6: Sync Bare-Repo + Worktree (POST-MERGE)

After GitHub merges, the local bare-repo's `refs/heads/development` is stale.
Update it explicitly + pull the development worktree into sync.

```bash
# Sync the development worktree to match origin.
# Because dev is checked out in a worktree, refs/heads/development IS the
# worktree's branch ref; the pull updates the bare-repo's ref as a side
# effect, so no explicit update-ref is needed.
# Use --ff-only: after a remote merge of a fresh feature branch the worktree
# is strictly behind origin, so fast-forward is the only correct outcome.
# --rebase would silently replay any unexpected local dev commits, which is
# never what we want here.
git -C /Users/max/dev/being/development fetch origin
git -C /Users/max/dev/being/development pull --ff-only origin development
```

**Display**:
```
🔄 Synced bare-repo + development worktree
   refs/heads/development → [MERGE_SHA]
```

**Error handling**:
- If `pull --ff-only` fails (not a fast-forward): ABORT with message
  "development worktree has unrelated local commits; resolve manually before
  next b-close". Do NOT auto-rebase — unexpected dev commits should be
  surfaced, not silently absorbed.

---

### Step 3.7: Verify remote feature branch was deleted

`gh pr merge --delete-branch` (Step 3.5) silently skips its branch-delete API
call when its local-checkout step fails — which it always does in our
bare-repo + worktrees setup because `development` is held by the dev worktree
(`fatal: 'development' is already used by worktree at …`). This defensive
check catches that and cleans up.

```bash
if git ls-remote origin "refs/heads/[feature-branch-name]" | grep -q .; then
  echo "ℹ️  Feature branch still on origin (gh --delete-branch skipped); cleaning up"
  git push origin --delete [feature-branch-name]
  echo "🗑️  Deleted [feature-branch-name] from origin"
else
  echo "✓ Feature branch already removed from origin"
fi
```

Idempotent — safe to re-run. Do NOT remove the `--delete-branch` flag from
Step 3.5: in workflows where gh's local-checkout succeeds (no worktree on the
base branch), the flag still works and this step becomes a confirmation.

---

### Step 3.8: Delete local feature branch

**Runs AFTER Phase 5.1, not here.** Neither `-d` nor `-D` can delete a branch that is
checked out in a worktree, and the item's worktree is still present at this point — so
this step fails with `cannot delete branch … used by worktree` on every close that has
one. Remove the worktree first, then delete the branch.

After the PR is merged and the worktree is synced, the local feature branch
sits as an orphan ref (`gh pr merge --delete-branch` deletes only the remote
ref, and even that fails on the bare-repo worktree-conflict pattern from
Step 3.7). Clean it up so `git branch` listings stay accurate.

```bash
if git rev-parse --verify --quiet [feature-branch-name] >/dev/null; then
  git branch -D [feature-branch-name]
  echo "🗑️  Deleted local branch: [feature-branch-name]"
else
  echo "✓ Local branch already absent"
fi
```

Idempotent — safe to re-run.

**Note**: `-D` (force) is intentional. `-d` would check upstream-merged
status, which fails after Step 3.7 since the remote ref is gone. The merge
commit being in `origin/development` (verified by Step 3.6's `pull --ff-only`
success) is the sufficient safety check; if Step 3.6 succeeded, the work is
preserved on remote.

---

## Phase 4: Update Notion

### Step 4.1: Update Status to "Done"

**Do not set `Done` when an AC is unserved and externally blocked.** Distinct from the
header's slice case: the branch is final, but part of the item cannot ship. Ask whether to
close-and-file-a-successor or hold `In progress` — `Done` tells every later reader that the
blocked work exists.

```
mcp__notion__notion-update-page
data: {
  "page_id": "[page_id from Phase 1]",
  "command": "update_properties",
  "properties": {
    "Status": "Done"
  }
}
```

---

### Step 4.2: Add Completion Comment

**Generate timestamp**: Current date/time in format: `2025-10-03 19:45 PDT`

**Comment content**:
```
✅ Closed via /b-close

📅 Completed: [timestamp]
🌿 Branch: [feature-branch-name]
🔀 Merged to: development
📊 Commits: [commit count if available]

[Optional: Include testing notes/feedback from conversation]

---
🤖 Automated by Claude Code
```

**Create comment**:
```
mcp__notion__notion-create-comment
page_id: "[page_id from Phase 1]"
markdown: "[comment content above]"
```

`page_id` is a TOP-LEVEL parameter and the content field is `markdown`, a single string.
Do not use `parent:` + `rich_text[]` — that shape is rejected, and `rich_text`'s per-object
2000-char cap cannot hold a normal completion comment anyway.

---

## Phase 5: Cleanup & Summary

### Step 5.1: Ask About Worktree Cleanup

```
🌿 Branch merged successfully!

Remove worktree directory? (y/n/later)
- y: Remove worktree now
- n: Keep worktree for reference
- later: Keep for now, remind me

Worktree: ~/being/[worktree-dir]/
```

**If user chooses "y"**:
```bash
cd /Users/max/dev/being
git worktree remove [worktree-dir] --force
# `remove` refuses on leftover untracked files (node_modules, a Finder .DS_Store
# recreated mid-delete). The merge is already confirmed by Step 3.5, so:
[ -d "[worktree-dir]" ] && rm -rf "[worktree-dir]" && git worktree prune

# INFRA-435 — reap the DerivedData this removal just orphaned. Only on "y":
# on n/later the worktree is still live and its root still resolves, so the
# sweep could not touch it anyway.
bash /Users/max/dev/being/development/app/scripts/e2e-sim-clean.sh --orphans --yes
```

Run the sweep from the `development` worktree, not the one being removed — the
script goes with it. Removal is simultaneously the moment the orphan is created
and the last moment its path is known, which is why the hook lives here.

The sweep is repo-wide, so the reported figure covers **every** orphan on the
machine, not just this worktree's. Say so when reporting it.

**Display**:
```
🗑️  Worktree removed: [worktree-dir]
♻️  DerivedData: ~N GB reclaimed across M orphaned cache(s) (machine-wide)
```

**If user chooses "later"**:
Add to Notion comment:
```
📝 Note: Worktree still exists at ~/being/[worktree-dir]
   Run manually when ready: git worktree remove [worktree-dir]
```

---

### Step 5.2: Final Summary

```
✅ [WORK_ITEM_ID] closed successfully!

Summary:
  Status: Done
  Branch: [feature-branch-name]
  Merged to: development
  Notion updated: ✓
  Worktree: [removed/kept]

Next steps:
  - Continue with next item: /b-work [NEXT-ITEM]
```

---

## Phase 6: Skill Retrospective (conditional — most runs skip this)

Fires **only** on one of two triggers:

- **A durable process correction**: the user corrected how this skill operates, a
  documented step here was wrong or missing, or friction hit that would recur on
  unrelated future closes. The load-bearing seams are Phase 0's drift check, Phase
  2.5's gate scoping and provenance, Step 3.4's merge verdict, and the Notion +
  cleanup tail.
- **An observed improvement opportunity** (stricter bar, max ONE per run): nothing
  broke, but something in *this* close would have gone measurably smoother with a
  procedure change, and you can cite the concrete moment. No observed moment this
  run → not a suggestion, regardless of how good the idea seems.

**Not a lesson — skip silently, say nothing:** anything about the work item being
closed (its bug, its diff, its review), a one-off CI flake that passed on re-run,
anything already covered here or in `.claude/CLAUDE.md`, and speculative flags or
phases with no observed trigger this run.

**If a lesson qualifies:**
1. **Route it**: close / merge / gate procedure → this file
   (`/Users/max/dev/being/.claude/commands/b-close.md`); a *project* fact (build, env,
   native, CI, dependency) → propose an entry for `.claude/CLAUDE.md` → Known Gotchas;
   a lesson about planning or implementing → flag it for `/b-work`, don't record it here.
2. **Draft the smallest edit.** Amend over append, **~4 lines of prose, ceiling.**
   **No worked examples, no incident retellings, no work-item ID cited as
   illustration** — git already holds the story. This file is large and loads every
   run, so if appending, name what could be pruned to pay for it.
3. **Present as a diff** with one line of justification: the lesson, and which future
   closes it helps.
4. **Never auto-apply, and apply EXACTLY the approved text** — "make it concise" means
   trim what was shown, never rewrite or add. On decline, drop it — do not re-propose.

---

## Error Recovery

**If command interrupted mid-execution**:
- Phase 1-2 interruption: Safe to re-run (idempotent)
- Step 3.1 interruption (conflict merging origin/development): User resolves conflicts in the worktree, commits the merge with the default `Merge branch ...` subject, then re-runs `/b-close` — sync step will see BEHIND=0 and continue from Step 3.2
- Phase 3 interruption (PR merge conflicts): User resolves on GitHub or locally, re-runs command
- Phase 3.7 interruption (branch cleanup): Safe to re-run; check is idempotent
- Phase 4 interruption (Notion): Re-run will update status/comment
- Phase 5.1 interruption (worktree): Manual cleanup if needed

**Safe to run multiple times**: Command checks state at each phase and skips completed steps.

---

*File location: /Users/max/dev/being/.claude/commands/b-close.md*
