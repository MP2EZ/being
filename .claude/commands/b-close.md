# Close Work Item & Merge [META-COMMAND]

**WORK_ITEM_ID**: $ARGUMENTS (optional - will auto-detect from current branch if not provided)

**Database ID**: `${NOTION_WORK_DB}` (defined in `CLAUDE.md`)

**GitHub Flow note (INFRA-145)**: Closes the work item to `development` via PR
(no longer local-merge + push, because dev branch protection now requires PRs).
Does NOT promote to `main` — use `/b-release` for that. The `--push` flag is
deprecated (PR merge always pushes); accepted as a no-op for backward compat.

> 💡 For best flow: ensure Accept Edits mode is active (Shift+Tab to cycle).
> This skill makes multiple tool calls (Notion + git + gh CLI) per run.

---

## Phase 0: Safety-path drift check (INFRA-416)

Phase 2.5 below decides whether the Maestro gate fires by matching changed paths
against a hand-maintained grep. That grep and CLAUDE.md's Protected Paths table
have silently diverged twice — `features/guidance/` (FEAT-55 slice 1 shipped
GREEN) and `features/consent/` (DEBUG-390's fix file matched nothing; the gate
fired only because the branch also touched two `.maestro` flows). Reconciling
them once just resets the clock, so the reconciliation is enforced:

```bash
bash /Users/max/dev/being/.claude/scripts/check-safety-paths.sh || exit 1
```

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
/b-close MAINT-79 --push    # Close and push (--push is a no-op, kept for backcompat)
/b-close --push             # Auto-detect work item, push
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
SAFETY_CANDIDATES=$(git diff --name-only origin/development...HEAD | \
  grep -vE '(__tests__/|\.test\.|\.spec\.)' | \
  grep -E '^app/(src/features/(assessment|consent|crisis|guidance)|src/core/services/security|src/core/navigation/|src/core/config/e2eSeed\.ts|\.maestro/|app\.json|ios/.*Info\.plist)' || true)

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
  CHANGED_LINES=$(git diff origin/development...HEAD -- "$f" \
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
CRISIS_HOST_CHANGED=$(git diff origin/development...HEAD -- 'app/**/*.tsx' 'app/**/*.ts' \
  ':(exclude)app/**/__tests__/**' ':(exclude)app/**/*.test.*' ':(exclude)app/**/*.spec.*' \
  | grep -E '^[+-].*CollapsibleCrisisButton' \
  | grep -vE '^[+-][[:space:]]*(//|\*|/\*)' || true)
```

**INFRA-256 decision table** — which safety-path change classes skip the gate vs. trigger it (the implementer/maintainer's quick reference; the bash above is the source of truth):

| Change class under a safety path | Gate? | Why |
|---|---|---|
| Dead-code deletion (≥1 removed, 0 added) | **skip** | Removing unreachable code can't change a running flow (MAINT-254 case). |
| Comment / JSDoc / whitespace-only | **skip** | No executable line changed. |
| Real threshold / scoring edit (assessment) | **trigger** q9/phq9/gad7 | Added executable line → live. |
| Crisis-dir UI / screen / component change | **trigger** crisis-button | Added executable line under `features/crisis/`. |
| `CollapsibleCrisisButton` re-host in ANY dir | **trigger** crisis-button | Content detection (`CRISIS_HOST_CHANGED`), exempt from inert filter. |
| Comment merely NAMING the overlay, in any file | **skip** | Not a re-host; changes no rendered output, so no flow can see it. Citing its 44pt decision as a precedent is normal. |
| `core/services/security` (non-encryption) / `core/navigation` change | **full suite** | Cross-cutting; existing override in Step 2.5.3. |
| `features/consent/` change | **`e2e:safety:consent-gate`** | INFRA-416. Hosts the pre-consent 988 footer; `LegalGate` is in `SUPPRESSED_ROUTES`, so the root overlay does not cover for it. |
| `features/guidance/` change | **gated → crisis-button fail-safe** | INFRA-416. No flow pins its threshold routing; the gap is logged loudly rather than silently skipped. |
| `features/practices/` change | **not gated** (recorded exemption) | INFRA-416. Protected for `philosopher`, not 988 reachability; no safety-e2e cell in the Validation Matrix. Pinned by `check-safety-paths.sh`. |
| Test-only file (`__tests__/`, `.test.`, `.spec.`) | **skip** | Drives nothing in the running app (pre-existing exclusion). |
| `app.json` / `Info.plist` change (incl. deletions) | **gated as today** | Bypasses inert filter; contracts pinned by the INFRA-184 jest test, but keep the coarse net. |
| `.maestro/<flow>.yaml` added or edited | **trigger** that flow | The flow IS the contract; one that has never run is not coverage. Bypasses the inert filter — a deletion-only diff here is assertions being removed. |
| `.maestro/_<helper>.yaml` edited | **full suite** | Any flow may include a helper subflow. |
| `.maestro/crisis-988-dial.yaml` edited | **no sim flow** — hardware notice | `safety-device-only`; sim `canOpenURL` is unconditionally false, so it cannot pass here. Run `e2e:safety:988-dial` on a real iPhone. |
| `src/core/config/e2eSeed.ts` | **full suite** | Sets the launch state every flow starts from; no narrower scope is valid. |
| Mixed comment + code on one line / pure type-only edit | **trigger** | Bash can't safely prove inert → bias safe. |

If BOTH `SAFETY_CHANGED` and `CRISIS_HOST_CHANGED` are empty → skip the gate:
```
ℹ️  No safety-surface changes detected — skipping Maestro e2e gate
```
Proceed to Step 3.1.

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
SCRIPTS=()
# --- Classify: which safety changes are RENDER/BOOT-relevant vs SERVICE-LAYER-only? ---
# The sim flows drive the UI; they can ONLY validate render / boot / navigation surfaces.
# Pure service-layer code is jest-owned (precommit + CI's crisis/clinical/security/
# encryption suites + the CollapsibleCrisisButton render tests) and need not pull a sim
# build. Two carve-outs, both fail SAFE (a file leaves the sim-relevant
# set only when unambiguously non-UI).
# NOTE (INFRA-383): these carve-outs were originally sized against a 10-15 min EAS build,
# on the reasoning that charging one for a service-layer change trains the `--skip-e2e`
# reflex. The build is now ~1 min warm, so that cost argument no longer holds and the
# carve-outs could be re-widened for real coverage. Deliberately NOT done here — widening
# gate scope is its own change with its own validation. Left as a recorded opportunity:
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
    if ($0 ~ /EncryptionService|SecureStorageService/) { print }
    next
  }
  { print }
')
# Crisis UI dir touched (overlay/screens/components — services/ already carved out) OR the
# overlay re-hosted/edited anywhere (FEAT-212 content detection) → reachability flow.
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/crisis/' || [ -n "$CRISIS_HOST_CHANGED" ]; then
  SCRIPTS+=("e2e:safety:crisis-button")
fi
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/assessment/' && \
  SCRIPTS+=("e2e:safety:q9" "e2e:safety:phq9" "e2e:safety:gad7")
# INFRA-416: features/consent hosts the PRE-consent 988 footer (CombinedLegalGateScreen),
# and LegalGate is in SUPPRESSED_ROUTES so the root overlay does not cover for it.
# deeplink-consent-gate.yaml is the flow that lands on that screen and asserts the
# affordance, so it is the correct scoped target — NOT the fail-safe crisis-button.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/consent/' && \
  SCRIPTS+=("e2e:safety:consent-gate")
# INFRA-416: features/guidance has NO flow. guidanceGate.ts consumes the PHQ-9/GAD-7
# thresholds to route a distressed user to Stoic content vs crisis resources — a live
# safety decision with ZERO e2e coverage (no flow references guidance or tier content;
# the dir is 3 files, all service/type/constants, so nothing renders for a flow to drive
# today). It is gated here so the change cannot pass silently, and falls through to the
# render/boot fail-safe below. Filed as its own coverage gap; when a flow exists, map it
# here and delete this note.
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/guidance/'; then
  echo "⚠️  features/guidance/ changed — NO Maestro flow pins its threshold routing."
  echo "    guidanceGate.ts decides Stoic-content vs crisis-resources on PHQ-9/GAD-7."
  echo "    Falling through to the crisis-button fail-safe; jest owns the threshold"
  echo "    logic (npm run test:clinical). Coverage gap tracked separately."
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
  SCRIPTS+=("e2e:safety:crisis-button")
# --- `.maestro/` flow edits + e2eSeed.ts: this gate's OWN contract surface ---
# An edited flow is validated by running that flow. Three cases the obvious mapping
# gets wrong, which is why this is a case statement and not a name transform:
#   • `_`-prefixed files are helper subflows, not flows — any flow may include one,
#     so the blast radius is the whole suite.
#   • daily-loop-*.yaml have NO scoped npm script (verify against package.json before
#     assuming one exists) — they can only be reached via the full suite.
#   • crisis-988-dial.yaml is tagged safety-device-only and CANNOT pass in the sim:
#     canOpenURL returns false unconditionally there regardless of the array's
#     contents. Adding it would make every 988-flow edit an unfixable red gate, so it
#     is deliberately excluded and surfaced as a hardware instruction instead.
FULL_SUITE=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$(basename "$f")" in
    _*.yaml) FULL_SUITE=1 ;;
    crisis-988-dial.yaml)
      echo "📱 crisis-988-dial.yaml changed — safety-device-only. The sim's canOpenURL"
      echo "   returns false unconditionally, so this flow cannot pass here and is NOT"
      echo "   added to the run set. Validate on real hardware before merging:"
      echo "   npm run e2e:safety:988-dial (with an iPhone connected)." ;;
    q9-single-alert.yaml)            SCRIPTS+=("e2e:safety:q9") ;;
    phq9-severe-completion.yaml)     SCRIPTS+=("e2e:safety:phq9") ;;
    gad7-severe.yaml)                SCRIPTS+=("e2e:safety:gad7") ;;
    crisis-button-reachability.yaml) SCRIPTS+=("e2e:safety:crisis-button") ;;
    journal-crisis-scan.yaml)        SCRIPTS+=("e2e:safety:journal") ;;
    deeplink-consent-gate.yaml)      SCRIPTS+=("e2e:safety:consent-gate") ;;
    *) FULL_SUITE=1 ;;
  esac
done <<< "$(echo "$RENDER_BOOT_RELEVANT" | grep -E '\.maestro/.*\.yaml$' || true)"
# e2eSeed sets the launch state EVERY flow starts from, so no narrower scope is valid.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/core/config/e2eSeed\.ts' && FULL_SUITE=1

# core/navigation (incl. CleanRootNavigator) is genuinely cross-cutting UI/nav — a
# tab/stack re-point can break ANY flow's reachability. Keep the full suite, LAST so
# this replace-override wins over the += clauses above when combined.
echo "$RENDER_BOOT_RELEVANT" | grep -qE 'src/core/navigation/|CleanRootNavigator' && \
  SCRIPTS=("e2e:safety")  # full suite — cross-cutting change, override scope
[ -n "$FULL_SUITE" ] && SCRIPTS=("e2e:safety")  # same override, from the block above

# Safety net / clean-skip split: if nothing mapped, decide WHY via RENDER_BOOT_RELEVANT.
#  • render/boot-relevant change we failed to map → fail SAFE to crisis-button (never
#    enter the gate on a render/boot change and run zero flows).
#  • ONLY service-layer carve-outs changed → deliberate, LOGGED skip (no silent cap):
#    jest owns the surface; no sim build needed (this is the MAINT-237 narrowing payoff).
if [ ${#SCRIPTS[@]} -eq 0 ]; then
  if [ -n "$RENDER_BOOT_RELEVANT" ]; then
    SCRIPTS=("e2e:safety:crisis-button")
  else
    echo "ℹ️  Safety-surface change is SERVICE-LAYER ONLY (MAINT-237 narrowing) — no sim flow:"
    echo "$SAFETY_CHANGED" | sed 's/^/      /'
    echo "    The sim flows only validate render/boot/nav; this change touches none. jest"
    echo "    crisis/clinical/security/encryption suites + CollapsibleCrisisButton render"
    echo "    tests (precommit + CI) own it. Proceeding to close with no sim build."
  fi
fi

# Dedupe (only when non-empty — a clean service-layer skip leaves SCRIPTS intentionally empty)
[ ${#SCRIPTS[@]} -gt 0 ] && SCRIPTS=($(printf "%s\n" "${SCRIPTS[@]}" | sort -u))
```

### Step 2.5.4: Verify simulator readiness

**FIRST — sync with `origin/development` (Step 3.1) BEFORE building.** This phase runs
before Step 3.1 in file order, but gating a tree you are about to change tests an artifact
that never merges. If `git rev-list --count HEAD..origin/development` is non-zero, perform
Step 3.1's merge **now**, then build and gate the merged tree. Otherwise the flows validate
the pre-merge tree while the merged result — the thing that actually lands on `development`
— is exercised by no runtime check at all; CI's jest suites do run on the merged PR, but the
Maestro flows are the only runtime UI validation there is. Doing it here also gets you
INFRA-383's fast build, since `e2e-sim-build.sh` is app code that arrives with the
back-merge. `git merge` does not fire the pre-commit hook, so run `npm run precommit`
against the merged tree before spending a build on it.

**SECOND — is this worktree's build script the new one?** `.claude/` is shared across every
worktree (it lives on `_bare`), but `app/scripts/e2e-sim-build.sh` is **app code**, so it
arrives only when INFRA-383 is on *this branch*. Until a branch back-merges `development`,
the guidance below describes a build that worktree cannot produce. Detect it rather than
letting the operator discover it 12 minutes in:

```bash
if [ ${#SCRIPTS[@]} -gt 0 ]; then
  if ! grep -q 'INFRA-383' app/scripts/e2e-sim-build.sh 2>/dev/null; then
    echo "⚠️  This worktree still has the LEGACY EAS gate build (pre-INFRA-383)."
    echo "    'npm run e2e:safety:build' here = eas build --local: 10-15 min EVERY run,"
    echo "    and it additionally requires eas-cli logged in + fastlane + a clean tree."
    echo ""
    echo "    To get the ~1 min incremental Release build, back-merge development first:"
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
`expo run:ios --configuration Release`, ~1 min warm instead of 10–15, so there is
no longer a cost argument for skipping it.

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
if [ ${#SCRIPTS[@]} -gt 0 ]; then
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
if [ ${#SCRIPTS[@]} -eq 0 ]; then
  echo "✅ No sim flows required (service-layer-only safety change, Step 2.5.3) — proceeding to close."
else
  # INFRA-384 — a merge gate's evidence must correspond to the commit being merged, so
  # a dirty-tree marker is a FAILURE here even though it is only a banner for a human
  # iterating locally. AC3 and AC4 are opposite policies over one implementation; this
  # variable is the whole difference. Set here as well as checked in 2.5.4 because the
  # per-flow scripts route through e2e-safety.sh, which re-verifies at run time — the
  # tree can move between the readiness check and the flow.
  export E2E_REQUIRE_CLEAN_PROVENANCE=1
  for script in "${SCRIPTS[@]}"; do
    echo "🛡️  Running: npm run $script"
    if ! npm run "$script"; then
      echo "❌ Maestro flow '$script' failed."
      echo "   Fix the issue, or — on a hotfix/* branch only — re-run with --skip-e2e."
      echo "   Debug a single flow with: maestro test .maestro/<flow>.yaml --debug"
      exit 1
    fi
  done
  echo "✅ All scoped Maestro safety flows passed (${#SCRIPTS[@]} script(s))"
fi
```

Proceed to Step 3.1 only on success.

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
for i in $(seq 1 30); do
  gh pr checks [PR_NUMBER] >/dev/null 2>&1 && break
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
parent: { "page_id": "[page_id from Phase 1]" }
rich_text: [
  {
    "type": "text",
    "text": {
      "content": "[comment content above]"
    }
  }
]
```

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
```

**Display**:
```
🗑️  Worktree removed: [worktree-dir]
```

**If user chooses "later"**:
Add to Notion comment:
```
📝 Note: Worktree still exists at ~/being/[worktree-dir]
   Run manually when ready: git worktree remove [worktree-dir]
```

---

### Step 5.2: Push to Remote (DEPRECATED — kept for backward compat)

**INFRA-145 GitHub Flow note**: This step is now a no-op. The PR merge in
Phase 3.5 already pushes development to origin via the GitHub API. The
`--push` flag is accepted as a no-op for backward compatibility with prior
invocations.

```
ℹ️  Push handled automatically by gh pr merge (Phase 3.5). No action needed.
```

---

### Step 5.3: Final Summary

```
✅ [WORK_ITEM_ID] closed successfully!

Summary:
  Status: Done
  Branch: [feature-branch-name]
  Merged to: development
  Notion updated: ✓
  Worktree: [removed/kept]
  Pushed to remote: [✓ / -]

Next steps:
  [If NOT pushed]
  - Push to remote: cd ~/being/development && git push

  [If pushed]
  - Remote updated ✓

  - Continue with next item: /b-work [NEXT-ITEM]
```

---

## Error Recovery

**If command interrupted mid-execution**:
- Phase 1-2 interruption: Safe to re-run (idempotent)
- Step 3.1 interruption (conflict merging origin/development): User resolves conflicts in the worktree, commits the merge with the default `Merge branch ...` subject, then re-runs `/b-close` — sync step will see BEHIND=0 and continue from Step 3.2
- Phase 3 interruption (PR merge conflicts): User resolves on GitHub or locally, re-runs command
- Phase 3.7 interruption (branch cleanup): Safe to re-run; check is idempotent
- Phase 4 interruption (Notion): Re-run will update status/comment
- Phase 5.1 interruption (worktree): Manual cleanup if needed
- Phase 5.2 interruption (push): Re-run will attempt push again (idempotent)

**Safe to run multiple times**: Command checks state at each phase and skips completed steps.

---

*File location: /Users/max/dev/being/.claude/commands/b-close.md*
