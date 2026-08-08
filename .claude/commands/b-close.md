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

**Search with explicit Work Item ID** (semantic search has **no exact-ID match** — it
returns a recency-weighted set, so widen the page size and match by property, never by rank):
```
mcp__notion__notion-search
query: "Work Item ID: [WORK_ITEM_ID]"
data_source_url: "collection://${NOTION_WORK_DB}"
query_type: "internal"
page_size: 25
max_highlight_length: 0
```

**Example**: For worktree `maint-140`:
```
query: "Work Item ID: MAINT-140"
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
  *"Couldn't resolve [WORK_ITEM_ID] via search (the Notion MCP has no exact-ID query). Paste the
  Notion page link and I'll fetch it directly."* — then `notion-fetch` the URL and verify the ID.

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
SAFETY_CANDIDATES=$(git diff --name-only origin/development...HEAD | \
  grep -vE '(__tests__/|\.test\.|\.spec\.)' | \
  grep -E '^app/(src/features/(assessment|crisis)|src/core/services/security|src/core/navigation/|app\.json|ios/.*Info\.plist)' || true)

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
  case "$f" in
    *app.json|*Info.plist) SAFETY_CHANGED+="${f}"$'\n'; continue ;;
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
| Test-only file (`__tests__/`, `.test.`, `.spec.`) | **skip** | Drives nothing in the running app (pre-existing exclusion). |
| `app.json` / `Info.plist` change (incl. deletions) | **gated as today** | Bypasses inert filter; contracts pinned by the INFRA-184 jest test, but keep the coarse net. |
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
# encryption suites + the CollapsibleCrisisButton render tests) and must not pull a slow
# no-dev-client EAS build. Two carve-outs, both fail SAFE (a file leaves the sim-relevant
# set only when unambiguously non-UI):
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
# core/navigation (incl. CleanRootNavigator) is genuinely cross-cutting UI/nav — a
# tab/stack re-point can break ANY flow's reachability. Keep the full suite, LAST so
# this replace-override wins over the += clauses above when combined.
echo "$RENDER_BOOT_RELEVANT" | grep -qE 'src/core/navigation/|CleanRootNavigator' && \
  SCRIPTS=("e2e:safety")  # full suite — cross-cutting change, override scope

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

The gate requires a **no-dev-client** build on the sim (INFRA-216), NOT a dev
build and NOT a plain `--configuration Release` build. `expo-dev-client` is a
project dependency, so BOTH `npm run ios` and `expo run:ios --configuration
Release` still ship the Expo dev launcher, which the flows can only navigate by a
guessed-coordinate tap — the gate flakes badly and trains `--skip-e2e` reflexes.
Only the EAS `e2e-sim` profile (`developmentClient:false`) removes the launcher;
`npm run e2e:safety:build` produces + installs it. The check below can't tell
which build is installed, so this is guidance, not enforcement — if flows flake
in the launcher/onboarding preamble, reinstall via `e2e:safety:build` before
suspecting a real regression. (Known INFRA-216 follow-up: even on the no-dev-client
build the slower Release boot leaves the long preamble timing-fragile — not yet
≥5/5 consecutive; expect occasional retries until the seed-state follow-up lands.)

```bash
# Only require a simulator when there are flows to run. A service-layer-only safety
# change (Step 2.5.3) resolves to zero flows and closes with no sim build at all.
if [ ${#SCRIPTS[@]} -gt 0 ]; then
  if ! xcrun simctl list devices booted | grep -qE '\([A-F0-9-]+\) \(Booted\)'; then
    echo "❌ No iOS simulator booted."
    echo "   Run 'npm run e2e:safety:build' first (no-dev-client EAS build, INFRA-216) to build +"
    echo "   install Being on a sim, then retry /b-close. Do NOT use 'npm run ios' (dev build → flaky gate)."
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
    echo "   Run 'npm run e2e:safety:build' first (no-dev-client EAS build, INFRA-216), then retry /b-close."
    exit 1
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
