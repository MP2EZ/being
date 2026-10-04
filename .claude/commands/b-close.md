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
# Fourth, same shape and same cost: if the diff touches app/src/**, run
# `npm run test:integration` (~1min). Also absent from precommit, and a changed hook
# return or component prop leaves the wholesale mocks under __tests__/integration/
# stale — a break invisible to every local chain.
# Fifth, same shape: if the diff touches app/scripts/ or app/__tests__/scripts/, run
# `CI=true npx jest __tests__/scripts/ --ci` (~50s). No precommit pattern matches that
# directory, so CI's "Script guard tests" job is the first thing to run it, and
# CI=true changes tool behaviour there, so run it the way CI does. On a safety-path
# branch the fix commit then invalidates provenance.
# All four conditional checks read the WORKING TREE, so on a branch that is behind
# they test a tree that will not merge — and a back-merge landing mid-run can add
# suites the run never saw. Check `git rev-list --count HEAD..origin/development`
# first; if non-zero, do Step 2.5.0's sync before these, not after.
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
  grep -E '^app/(src/features/(assessment|consent|crisis|guidance|journal|practices/dailyloop)|src/features/insights/(components/|screens/InsightsScreen\.tsx)|src/features/home/screens/CleanHomeScreen\.tsx|src/features/learn/practices/(PracticeTimerScreen|ReflectionTimerScreen|BodyScanScreen|GuidedBodyScanScreen|SortingPracticeScreen|PracticeCompletionScreen|shared/PracticeToggleButton|shared/usePracticeCompletion)\.tsx|src/features/practices/screens/PracticeLibraryScreen\.tsx|src/features/profile/screens/(DeleteAccountScreen|ProfileScreen|ExportDataScreen|PrivacyDataScreen)\.tsx|src/features/practices/shared/components/(HapticsOptInPrompt|ResumeSessionModal|BreathingCircle)\.tsx|src/features/practices/shared/haptics/|src/features/practices/shared/useIsFocusedSafe\.ts|src/core/services/security|src/core/services/speech/|src/core/services/logging/ExternalErrorReporter\.ts|src/core/navigation/|src/core/hooks/|src/core/components/(ThresholdEducationModal|BugReportOverlay)\.tsx|src/core/config/e2eSeed\.ts|src/core/stores/(consentStore|bugReportStore)\.ts|src/core/services/supabase/SupabaseService\.ts|App\.tsx|src/core/analytics/PostHogProvider\.tsx|plugins/|patches/|\.maestro/|app\.json|ios/.*Info\.plist)' || true)
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
  echo "          it a Step 2.5.3 flow arm plus a decision-table row. Record the ruling's" >&2
  echo "          prose in /Users/max/dev/being/.claude/docs/safety-path-rulings.md (INFRA-726)." >&2
  exit 1
fi
# INFRA-723 — Steps 2.5.3–2.5.5 live in a separate file so a gate-less close never loads
# them. This line is the only pointer an agent reading top-down is guaranteed to see.
if [ -n "$SAFETY_CHANGED" ] || [ -n "$CRISIS_HOST_CHANGED" ]; then
  echo "🔒 GATE REQUIRED — Read /Users/max/dev/being/.claude/docs/b-close-gate.md"
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
| `core/navigation` change | **full suite** | Cross-cutting; existing override in Step 2.5.3. |
| `core/services/security/(EncryptionService\|SecureStorageService).ts` change | **`crisis-button-reachability`** | Boot/render-critical: wellness data decrypts at assessment render and encryption init gates boot. |
| `core/services/security/DeepLinkValidationService.ts` change | **`deeplink-consent-gate` + `daily-loop-deeplink`** | DEBUG-636 (crisis ruling). The enforcing allowlist decides whether an external link, `being://crisis` included, is delivered. **Necessary, not sufficient**: the blocked case is a pure function, pinned by `deepLinkPathEnforcement.test.ts`. |
| Any other `core/services/security` change | **no sim flow** (jest-owned) | MAINT-237 service-layer carve-out. This row used to read "full suite", which the carve-out never did. |
| `features/consent/` change | **`deeplink-consent-gate` + `reconsent-stale` + `reconsent-stale-ineligible`** | INFRA-416. Hosts the pre-consent 988 footer (`LegalGate` is in `SUPPRESSED_ROUTES`). The dir hosts TWO gated screens: `reconsent-stale` is the only flow rendering `ReConsentScreen`, and mapping it under `consentStore.ts` alone left screen-level edits gated by a flow that never renders them. |
| Unrouted screen ADDED under a gated feature dir | **trigger** | INFRA-428. Render-unreachable is not module-unreachable: a barrel re-export puts the new module on the importer's eager graph, and `CleanRootNavigator` imports `@/features/consent` (the barrel), not the screen file. Keying the gate on "is this screen routed?" would have UNDER-triggered on the branch that raised the question. |
| `features/journal/` change | **`journal-crisis-scan`** | DEBUG-480. Hosts `scanOnSave`, the only crisis scan of typed/corrected text, plus the in-page banner and 988 action. |
| `src/core/services/speech/` change | **`journal-crisis-scan`** + printed notice | DEBUG-524 (crisis ruling). DIRECTORY-level: 2 files, both named. `onDeviceSpeechGuard.ts` admits the capture feeding `scanOnSave` and builds the options driving native audio setup; `audioArtifactSweeper.ts` is the reviewed non-crisis member (raw-audio erasure, not 988 reachability). **Necessary, not sufficient**: the flow finishes inside the ~15s abort window, so it cannot witness a native crash — `npm run e2e:safety:audio-liveness` is the oracle that can. |
| `app/patches/` change | **`crisis-button-reachability`** + printed notice | DEBUG-524 (crisis ruling). Same shape as `plugins/`: a patch alters native behaviour on a crisis path and the generated result is never reviewed. DEBUG-524 established a patch is the only remaining lever on the recognizer's audio teardown, so this path is live, not hypothetical. |
| `src/core/hooks/` change | **`journal-crisis-scan`** + 2 printed notices | DEBUG-525. Gated as a DIRECTORY: 3 of 5 files decide crisis-affordance placement/visibility, the 5th (`useCrisisExclusionAssertion.ts`, DEBUG-643) is a `__DEV__`-only check that is a Release no-op; the 4th has one lifetime commit — and is NOT benign (corrected DEBUG-533: `useBugReportShake.ts` arms a root-mounted gesture opening a zero-988 window). `journal-crisis-scan` is the only keyboard-up flow in the suite. `useKeyboardOccludesCrisisButton` (device-only) and the dynamic-type inset get instructions — neither is sim-runnable. |
| `core/components/ThresholdEducationModal.tsx` change | **`crisis-button-reachability`** | DEBUG-525. A DEBUG-406 conversion site: an RN `<Modal>` whose content tells the reader to seek help while occluding the route to it. The flow already taps through it, so the arm is free. |
| `features/home/screens/CleanHomeScreen.tsx` change | **`crisis-button-reachability`** | DEBUG-547. Consumes `crisisButtonGeometry` rather than owning crisis code. The FAB's `zIndex: 9999` makes any overlap a wrong-DESTINATION tap into `CrisisResources` — a crisis false POSITIVE. The flow already starts on Home and renders both rows, so the arm is free. **The flow is necessary and NOT sufficient**: Maestro taps element CENTRES, which never enter the contested column, so a point tap is required to falsify this. |
| `features/profile/screens/DeleteAccountScreen.tsx` change | **`crisis-button-reachability`** + device-only notice | INFRA-531 (crisis ruling). Consumes `crisisInputAccessory`; the keyboard is necessarily up (the user types the confirmation word), so on iOS the accessory is the SOLE 988 affordance. FILE-level — the dir's other crisis-bearing members have their own rows and `ProfileStackNavigator` is already covered by `CRISIS_HOST_CHANGED`. Also DEBUG-653: `delete-account-button` and `delete-confirm-input` clear the FAB with a `CRISIS_BUTTON_EXCLUSION_RECT` margin (the DEBUG-547 shape). **Necessary, not sufficient**: the flow never types into `delete-confirm-input`, so the keyboard-up half is pinned on the sim by `crisis-keyboard-reachability` — one runtime site; this screen is covered by construction via `CrisisTextInput` (DEBUG-590). It taps element CENTRES, so the clearance's falsifier is the jest every-y sweep. |
| `features/profile/screens/ExportDataScreen.tsx` change | **`crisis-button-reachability`** + printed notice | DEBUG-577 (crisis ruling). Owns `Sharing.shareAsync`, MEASURED to leave zero app-owned nodes in the hierarchy for the sheet's duration; a matched-pair coordinate tap reached `CrisisResources` with the sheet down and not with it up. Same shape as `ExternalErrorReporter`, and strictly MORE reachable: the JSON export path is always on and never flag-gated, where the bug-report surface is bounded by `bug_reporting`. (INFRA-571 argued this against Sentry's widget; FEAT-570 replaced it with the first-party overlay, and the flag bound still holds.) FILE-level — the dir's other crisis-bearing members have their own rows. Also DEBUG-653: `export-data-button` clears the FAB with a `CRISIS_BUTTON_EXCLUSION_RECT` margin (the DEBUG-547 shape). **Necessary, not sufficient**: no gate flow opens the share sheet, so the arm proves only that the route renders the overlay with the sheet DOWN; the flow taps element CENTRES, so the clearance's falsifier is the jest every-y sweep. |
| `.maestro/<flow>.yaml` tagged `safety-occlusion-measurement` edited | **no sim flow** — notice only, never scoped | DEBUG-577. `export-share-sheet-occlusion` PINS A DEBT STATE: its load-bearing assertion is that the 988 affordance is UNREACHABLE, so it stays green after a fix and must be DELETED, not repaired, if the occlusion is remedied. It also leaves an open share sheet — state Maestro does not reliably clear, which per DEBUG-422 reds later flows against a healthy app. Needs its own case arm; the `*)` catch-all would fire a full suite. |
| `features/profile/screens/ProfileScreen.tsx` change | **`crisis-button-reachability`** | DEBUG-533 (crisis ruling). Hosts the second entry to `showFeedbackForm()`, which opens a zero-988 window. Also DEBUG-653: the Onboarding Setup footer link clears the FAB with a `CRISIS_BUTTON_EXCLUSION_RECT` margin (the DEBUG-547 shape). The flow already walks the Profile tab and every subscreen depth, so the arm is free. **Necessary, not sufficient**: no flow opens the widget, so this proves only that Profile still renders the overlay; the flow taps element CENTRES, so the clearance's falsifier is the jest every-y sweep. |
| `features/profile/screens/PrivacyDataScreen.tsx` change | **`crisis-button-reachability`** + printed notice | DEBUG-653 (crisis ruling). The DEBUG-547 shape on `profile-card-delete`, the last control at max scroll since DEBUG-562: it clears the FAB with a `CRISIS_BUTTON_EXCLUSION_RECT` margin in its own style entry, never the shared `settingCard`. FILE-level — the dir's other crisis-bearing members have their own rows. The flow already walks Privacy & Data to that card, so the arm is free. **Necessary, not sufficient**: Maestro taps element CENTRES, so the falsifier is the host's jest every-y sweep. |
| `core/services/logging/ExternalErrorReporter.ts` change | **`bug-report-crisis-reachability` + `bug-report-suppressed-route`** | FEAT-570 REPLACED THIS ROW'S REASONING. It used to be notice-only, because "no sim flow opens the widget, and authoring one would emit a real Sentry feedback event". The first half expired: the widget is gone, opening is first-party and emits NOTHING, so a flow can open it. The second half is still true and now binds the flows instead — **neither may tap `bug-report-send`**, because the gate build resolves a live production DSN from `.env.production` and there is no INFRA-411-style egress suppression on `captureFeedback`. That row also asserted "`feedbackIntegration` is what mounts the provider at all", which is FALSE — `Sentry.wrap` mounts `FeedbackWidgetProvider` unconditionally (`sdk.js:127-139`) and `feedbackIntegration()` has no `setupOnce`. **Necessary, not sufficient**: the shake entry is not sim-drivable (Maestro 2.6.0 has no shake command), so its verdict is an attended device session. |
| `core/components/BugReportOverlay.tsx` / `core/stores/bugReportStore.ts` change | **`bug-report-crisis-reachability` + `bug-report-suppressed-route` + `crisis-button-reachability`** | FEAT-570 (crisis ruling). The overlay is armed at the app ROOT, so unlike the two `insights/` slot claimants it can be published while a FAB-suppressed route is active — a zero-988 state. The store is the sole gate on that and imports nothing of ours, so INFRA-531's rule cannot see it; the Protected Paths row is the only control. `bug-report-suppressed-route` is the one that proves the refusal, via an `e2eSeed` marker reproducing the real boot race. **Necessary, not sufficient**: same shake limitation as the row above. |
| An UNGATED file imports a crisis constant | **hard close FAILURE** — no flow | INFRA-531. `I531_IMPORT_RE` over the diff, anchored on the import specifier. An ALARM demanding a ruling (Protected Paths row + arm, or a recorded `i531_exempt_reason()` entry), never a silent flow pick. Exempt from the inert filter: class (a) *inverts* here — a removed crisis import is the extraction case it exists to catch — and class (b) is already discharged by its own comment exclusion. Membership is tested against `SAFETY_CANDIDATES` (pre-inert), or an already-ruled file with a deletion-only diff raises a failure nobody can discharge. Exits before Step 2.5.2, so `--skip-e2e` cannot reach it. |
| An ungated file imports the broad `@/features/assessment/types` barrel | **not detected** (recorded blind spot) | INFRA-531. The barrel re-exports the thresholds, but its ungated importers pull `AssessmentType`/`PHQ9Result` for chart axes and export plumbing — arming it would hard-fail four closes on day one. A binding-qualified arm is rejected: multi-line imports are invisible to a line-grep, and that misses silently. Bounded: `assessment/types/index.ts` is itself gated, so only a NEW ungated consumer of an existing re-export escapes. |
| `app/plugins/` change | **`crisis-button-reachability`** + printed notice | FEAT-522. A config plugin injects native code that can occlude every 988 affordance, and iOS is CNG so no AppDelegate diff is ever reviewed. No sim flow can observe it — Maestro drives an ACTIVE app and the shield exists only while inactive — so the arm proves the surrounding crisis paths still render and the notice points at the attended device script. |
| `features/insights/components/` change | **`crisis-button-reachability`** | INFRA-532. Gated as a DIRECTORY: 4 of 6 members are safety-bearing — two DEBUG-406 conversion sites plus the two files that publish them into the root overlay slot and decide whether either ever renders (`WeeklyReflectionCard`'s `MIN_CHECK_INS_TO_SHOW`, `WellnessScreeningTrends`' `notesEnabled`). The other three are `DotCalendar.tsx`, `PrincipleEngagementChart.tsx` and the barrel. The flow taps through `WeeklyReflectionComposer`, reachable only because `e2eSeed.ts` seeds four non-`daily` check-ins. **Necessary, not sufficient**: Maestro taps element CENTRES, so a marginal action-row geometry regression is invisible here — that is `modalOcclusionConversions.test.tsx`. `SessionNoteComposer` stays notice-only (flag-dark in the gate build); keyboard-up stays uncovered pending the `crisis-keyboard-accessory` repair. |
| `features/insights/screens/InsightsScreen.tsx` change | **`crisis-button-reachability`** | FEAT-669 (crisis ruling). The DEBUG-620 trailing-spacer shape on a tab screen: the scroll content ends in a `CRISIS_BUTTON_EXCLUSION_RECT.top` spacer, so no control sits in the FAB's band at maximum scroll. FILE-level: `WellnessTrendsDetailScreen.tsx` is unreviewed. **Necessary, not sufficient**: the flow taps element CENTRES; the falsifier is the jest spacer pin. |
| `features/guidance/` change | **`guidance-suppressed-handoff` + `guidance-gentle-tier-cap`** | FEAT-457 + INFRA-420. The first drives Home entry → suppressed → notice → CrisisResources → 988 with all four tier testIDs ABSENT; the second pins the positive branch (Tier 0/1 shown, Tier 2/3 capped). Both arms are required — suppression alone stays green if the gate suppresses everyone. Supersedes the INFRA-416 crisis-button fail-safe. |
| `features/practices/dailyloop/` change | **`daily-loop-quick-depth` + `daily-loop-deeplink`** | DEBUG-465. Hosts SUPPORT_LINE, pinned outside the ScrollView; the root overlay does not discharge its above-the-fold obligation. INFRA-509 narrowed this from the full suite: these two are the only tagged flows carrying a daily-loop testID, so they ARE that coverage. Also arms `daily-loop-ax5-entry` — see the AX5 row. |
| `features/practices/` change (outside `dailyloop/`) | **not gated** (recorded exemption) | INFRA-416. Protected for `philosopher`, not 988 reachability; no safety-e2e cell in the Validation Matrix. Pinned by `check-safety-paths.sh`. |
| `practices/shared/haptics/`, `shared/components/BreathingCircle.tsx` or `shared/useIsFocusedSafe.ts` | **`crisis-button-reachability`** + notice | DEBUG-587 (crisis ruling). `shared/haptics/` is DIRECTORY-level — all eight members are on the cue-delivery path — and `BreathingCircle.tsx` is FILE-level, beside the two rows above. Both route practice output that can reach a crisis screen: the hook gates the tactile and paired-speech channels, and `BreathingCircle` speaks every phase through `announceForAccessibility` on a path touching no haptics code. Neither imports from `features/crisis/`, so INFRA-531's rule misses both, and `practices/` is exempt outside `dailyloop/` — a diff whose whole subject was whether practice output reaches a crisis surface merged with this gate never firing. **Notice-only**: `e2e-sim` carries `practice_haptics:false`, so no flow can render a cue; the falsifier is `crisisBlurGate.test.tsx`. |
| `practices/shared/components/(HapticsOptInPrompt\|ResumeSessionModal).tsx` | **`daily-loop-quick-depth`** (Resume) / **`crisis-button-reachability`** + notice (Haptics) | DEBUG-586 (crisis ruling). Both size `paddingBottom` from `CRISIS_BUTTON_RESERVED_BAND` so their controls cannot sit under a `zIndex: 9999` FAB — a crisis FALSE POSITIVE, the DEBUG-547 shape. FILE-level: the other 12 members of that dir carry no crisis surface and a directory clause would re-import the over-trigger the `practices/` exemption one row above exists to prevent. `daily-loop-quick-depth` is the only flow rendering `resume-session-overlay` and already asserts the DEBUG-403 crisis round-trip there. **Necessary, not sufficient, both:** no Maestro assertion can read a `paddingBottom`, the flows tap element CENTRES, and `ResumeSessionModal.test.tsx:296-305` records a 1.5pt shortfall Maestro reported as a COMPLETED tap. `HapticsOptInPrompt` is flag-dark in the gate build (`practice_haptics:false`), so no flow renders it at all. The falsifier for both is the jest style assertion pinned to the imported constant. |
| `features/learn/practices/(PracticeTimerScreen\|ReflectionTimerScreen\|BodyScanScreen\|GuidedBodyScanScreen\|SortingPracticeScreen\|PracticeCompletionScreen\|shared/PracticeToggleButton).tsx` / `features/practices/screens/PracticeLibraryScreen.tsx` change | **`crisis-button-reachability`** + notice | DEBUG-618/620/622, extended DEBUG-628/631/634/637 (crisis ruling). The DEBUG-547 shape: each clears the FAB with a `CRISIS_BUTTON_EXCLUSION_RECT` inset — three toggle `marginRight`s, GuidedBodyScan's own `nextButton` margin, the library's row and featured-card margins, SortingPractice's two base entries covering three controls. PracticeCompletionScreen (DEBUG-678) clears Continue with a `primaryButton` right margin (DEBUG-682). FILE-level. **Necessary, not sufficient**: the flow renders none of them, so it proves only the FAB mount; the falsifier is the jest geometry pin against `intersectsCrisisButtonExclusion`. On SortingPractice the clearance is computed against the LAYOUT frame at scale 1: its card scales 0.9→1, and a uniform s ≤ 1 maps every edge inward, so s = 1 is the supremum — an `outputRange` above 1 would invert that and must come back through `crisis`. |
| `features/learn/practices/shared/usePracticeCompletion.tsx` change | **`crisis-button-reachability`** + notice | DEBUG-695 (crisis ruling). The completion path all five gated practice hosts share; it owns DEBUG-344's and DEBUG-695's "degrade, never throw" contracts, so a throw is process death with 988 lost. Imports nothing from `features/crisis/`, so INFRA-531 misses it. FILE-level. **Necessary, not sufficient**: no flow completes a practice; the falsifiers are the jest degrade contracts. |
| Test-only file (`__tests__/`, `.test.`, `.spec.`) | **skip** | Drives nothing in the running app (pre-existing exclusion). |
| `app.json` / `Info.plist` change (incl. deletions) | **gated as today** | Bypasses inert filter; contracts pinned by the INFRA-184 jest test, but keep the coarse net. |
| `.maestro/<flow>.yaml` added or edited | **trigger** that flow | The flow IS the contract; one that has never run is not coverage. Bypasses the inert filter — a deletion-only diff here is assertions being removed. |
| `.maestro/_<helper>.yaml` edited | **its transitive `runFlow:` callers** | INFRA-517. `runFlow:` is a static per-file include, so a helper reaches exactly its callers — measured on INFRA-494, where a `_legal-and-onboarding.yaml` diff ran 12 sim flows and all THREE of its callers are device-class (`crisis-988-dial` + `crisis-keyboard-accessory` `safety-device-only`, `breathing-fps-budget` `perf-device-only`), so none is sim-runnable — the count was two when INFRA-494 measured it. Callers that cannot run in the sim get a NOT-VERIFIED notice; the Step 2.5.3 net then still runs `crisis-button-reachability`, so this is one flow, never zero. Falls back to the full suite on any of: a `config.yaml`, matcher self-test failure, unreconciled residue, a depth-capped closure, or zero callers. |
| `.maestro/crisis-988-dial.yaml` edited | **no sim flow** — hardware notice | `safety-device-only`; sim `canOpenURL` is unconditionally false, so it cannot pass here. Run `e2e:safety:988-dial` on a real iPhone. |
| A screen carrying `CRISIS_FAB_CLEARANCE` changed, or `CollapsibleCrisisButton` | **notice only** — never scoped | INFRA-510. `reconsent-stale-ineligible-fab-clearance` is `safety-bottom-inset` and declares 393x852; 375x667 has a zero bottom inset, so the collision cannot occur there at any clearance value. Scoping it beside a 375x667 flow is unsatisfiable on one device — the shape that trains `--skip-e2e`. |
| `.maestro/<flow>.yaml` tagged `safety-dynamic-type` edited | **no sim flow** — instruction (except `daily-loop-ax5-entry`, AX5 row) | DEBUG-469 / DEBUG-507. The suite selects on an exact `- safety` tag at the DEFAULT content size, so it can neither select nor validly run these. `e2e:safety:ax5` (AX5) and `e2e:safety:xxxl` (largest non-accessibility step) own them. Each needs its own case arm; the `*)` catch-all would fire a pointless full suite. |
| `dailyloop/`, `CleanHomeScreen.tsx`, `CrisisResourcesScreen.tsx` or `daily-loop-ax5-entry.yaml` changed | **`daily-loop-ax5-entry`** at AX5, in its own invocation after the suite | DEBUG-546. The only flow walking Home → depth picker → beat 1 → Sphere Sovereignty → CrisisResources at AX5. As an instruction nobody ran it, and DEBUG-518 merged with it red. Runs through `e2e-dynamic-type.sh`, which sets and restores the content size, so it never joins `FLOWS`. The flow taps Skip inside a 30s app timer (measured 6-16s in, host load up to 2.65x): read the host load before reading a red as the app. |
| `src/core/stores/consentStore.ts` | **`deeplink-consent-gate` + `reconsent-stale` + `reconsent-stale-ineligible`** | INFRA-482. File-level, not `src/core/stores/`. Owns the consent-record writes, `canPerformOperation`, the forging seam, and the safety-critical `loadConsent` branch order. Siblings in that dir have no safety surface. |
| `src/core/config/e2eSeed.ts` | **full suite** | Sets the launch state every flow starts from; no narrower scope is valid. |
| `src/core/services/supabase/SupabaseService.ts` | **`q9-single-alert` + `phq9-severe-completion` + `gad7-severe` + `journal-crisis-scan`** + printed notice | INFRA-568 (crisis ruling). FILE-level: owns the sole `crisis_detected` writer and runs inside the frame `handleCrisisDetection` awaits, but the directory's other members (CloudBackupService, SyncCoordinator, secureStoreSessionAdapter, hooks/, index.ts) carry no crisis surface. INFRA-531's import rule cannot see it — nothing here imports from `features/crisis/`. **Necessary, not sufficient**: the gate build suppresses egress (INFRA-411), so these cover the awaited frame not throwing or blocking, never delivery. |
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

### Step 2.5.3: Map changed paths to scoped flow(s) — in the gate file

Steps 2.5.3, 2.5.4 and 2.5.5 live in `/Users/max/dev/being/.claude/docs/b-close-gate.md`
(INFRA-723), so a close that needs no gate never loads them. Read it now if Step 2.5.1
printed `🔒 GATE REQUIRED` and Step 2.5.2 took no hotfix bypass; Step 2.5.3 ends by
returning you to Step 2.5.3a below.

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
| `DYNAMIC_TYPE_FLOWS` is non-empty | The runner takes `--flows` for the tagged suite only; it cannot run `e2e-dynamic-type.sh` (DEBUG-546). |

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
`ConnectException` only in `maestro.log`, indistinguishable from a regression
(`/Users/max/dev/being/.claude/docs/e2e-gotchas.md`).
Never launch the suite itself with `&`, and never re-detach the runner.

**The runner's sync does not reinstall.** If `development` moved `app/package.json` or the
lockfile, back-merge and `npm ci` in the worktree before launching, so its sync is a no-op.

Then **stop** — do not fall through to 2.5.4. Report the run directory, tell the operator
to read `npm run close:status`, leave Notion `In progress`, and end the session. Phase 4
belongs to whoever acknowledges the result.

Staying attached is always valid and is the default when anything above is unclear.

---

### Steps 2.5.4–2.5.5: Simulator readiness and the scoped run — in the gate file

Staying attached on an active gate: continue with Step 2.5.4 in
`/Users/max/dev/being/.claude/docs/b-close-gate.md`. Step 2.5.5 ends by sending you
to Step 3.1. A gate-less close — Step 2.5.1 printed no `GATE REQUIRED` — has already taken
Step 2.5.3a above and continues to Step 3.1 from here.

---

## Phase 3: PR + Merge to Development

**GitHub Flow note** (INFRA-145): `development` branch protection requires PRs.
Direct local-merge-then-push is no longer possible. b-close now opens a PR,
waits for CI, then merges via `gh pr merge`.

### Step 3.1: Sync Feature Branch with origin/development

**Stop rule (INFRA-723).** Step 2.5.1 printed `🔒 GATE REQUIRED`, Step 2.5.5 printed no
verdict, and Step 2.5.2 took no hotfix bypass → STOP. The gate steps were never loaded:
read `/Users/max/dev/being/.claude/docs/b-close-gate.md` from Step 2.5.3.

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
Same class, different symptom: if the merge DELETED a sibling your prose cites, the
citation survives the merge cleanly and no test can see it — so re-read your own
cross-references, not only your placement.

**It can also merge two correct changes into a red suite.** When an incoming test
encodes a premise this branch removes, fix the incoming FIXTURE — never loosen this
branch's change to satisfy it, which silently reverts whatever ruling motivated it.

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

**When the item closes with a RULING rather than the feature, title the PR for what
merged.** The Notion Name describes the work that was declined, so the mapped title
misdescribes the history release notes are generated from. Keep the ID, replace the name.

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

**A GREEN rollup does not prove a NEW workflow step ran.** When the diff touches
`.github/workflows/`, confirm the step executed rather than being skipped or absent:
`gh run view <run-id> --json jobs -q '.jobs[]|select(.name=="<job>")|.steps[]|"\(.name)\t\(.conclusion)"'`

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

**`gh pr merge` can exit non-zero while the merge SUCCEEDS.** Its local-checkout step always
fails in this bare-repo setup (`'development' is already used by worktree`, Step 3.7), so take
the verdict from `gh pr view [PR_NUMBER] --json state` — never from the exit code. Aborting a
close on an already-merged PR is the expensive misread.

It can also remove the item's worktree and local branch along with the remote one (observed
with gh 2.100.0). If `[worktree-dir]` is gone after the merge, skip Step 5.1's question and
Step 3.8, but still run 5.1's DerivedData orphan sweep.

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

**An item whose deliverable spans `_bare` and a feature branch is only half-closed by this
PR.** `.claude/` is gitignored on `development`, so its commit travels separately and no CI
gate or jest pin can see it. Confirm the `_bare` half is committed before `Done` — a missing
one leaves the merged half referencing a procedure step that does not exist, silently.

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
# Run `remove` as its OWN call: the harness refuses any command containing an rm -rf of a
# worktree dir, so chaining the fallback blocks the remove too. Only if the dir survives
# (untracked leftovers), run this separately — it needs a human's approval:
[ -d "[worktree-dir]" ] && rm -rf "[worktree-dir]" && git worktree prune

# reap the DerivedData and CocoaPods cache entries this removal just orphaned (INFRA-435/691). Only on "y":
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
♻️  CocoaPods cache: ~N GB reclaimed across M orphaned entr(ies) (machine-wide)
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
