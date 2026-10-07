#!/usr/bin/env bash
#
# b-close-gate-plan.sh — INFRA-727
#
# /b-close Phase 2.5's detection (Step 2.5.1) and flow mapping (Step 2.5.3), run as ONE
# tested process instead of bash an agent re-types out of a skill file. Three defect
# classes it removes, each recorded in b-close or its gate file:
#   - transcription: 115 measured Bash calls re-typed chunks of the 18 KB 2.5.1 block,
#     and "an abbreviated copy silently drops entries and reports a clean set";
#   - the `$0` substitution: the harness rewrites `$0` when it RENDERS a command file,
#     so a copied awk `$0` matched nothing (twice). A script on disk is never rendered;
#   - shell state: 2.5.3 read 2.5.1's variables, which do not survive between Bash
#     calls. One process, and a result file for everything downstream.
#
# Usage:
#   bash b-close-gate-plan.sh --worktree <abs path> [--base <ref>]
#        The plan. Prints today's 2.5.1 + 2.5.3 output and writes the result file.
#   bash b-close-gate-plan.sh --worktree <abs path> --candidates-only [--base <ref> | --range A..B]
#        The path grep + crisis content detector only (no inert filter, no INFRA-531, no
#        mapping) — /b-batch Step 3.2's tiering, and Step 2.5.4's incoming re-check.
#   bash b-close-gate-plan.sh --worktree <abs path> --check-plan
#        Print the result file's path ONLY if it exists and is fresh for this tree (same
#        worktree, HEAD and merge base); otherwise exit 2. Every consumer loads it with:
#          GATE_PLAN="$(bash …/b-close-gate-plan.sh --worktree <wt> --check-plan)" && . "$GATE_PLAN" || exit 2
#   bash b-close-gate-plan.sh --worktree <abs path> --plan-path
#        Print where the result file for that worktree lives (fresh or not).
#   bash b-close-gate-plan.sh --print-regex
#        Print SAFETY_PATH_RE verbatim (check-safety-paths.sh probes it).
#
# Exit: 0 = a plan (or INAPPLICABLE: no app/ and no merge base — `_bare`)
#       1 = the INFRA-531 alarm: a ruling, not a gate run; `--skip-e2e` cannot reach it
#       2 = a tooling error: the plan could not be computed
#   A caller REFUSES THE CLOSE ON ANY NON-ZERO, 127 (script missing) included. Run it
#   unpiped and capture `rc=$?`: a `| tee`, a `|| true` or a test for 1 alone turns a
#   crashed script into "no safety changes" (crisis ruling, INFRA-727).
#
# Result file: ${TMPDIR}/b-close-gate-plan/<worktree slug>.env — never inside the
# worktree, where it would move the e2e provenance hash. Deleted at startup, written to a
# temp name and moved into place on success only, so a failed run leaves NO plan and a
# plan from an earlier close of the same worktree cannot be read as this one. Plain
# NAME=value / NAME=(a b) lines that source identically in bash and zsh (the Bash tool
# runs zsh). Consumers refuse it when missing, or when PLAN_HEAD / PLAN_MERGE_BASE differ
# from the tree they are about to gate, and branch on GATE_REQUIRED — never on FLOWS
# being empty, which is also what a service-layer-only change looks like.
#
# CHANGE CONTROL. A change to SAFETY_PATH_RE or to any Step 2.5.3 clause below changes
# what merges unverified: it needs a `crisis` review, a case in test-b-close-gate-plan.sh
# (b-close Phase 0 runs it), and — for a new Protected Path — the CLAUDE.md row that
# check-safety-paths.sh reconciles against this regex. Keep SAFETY_PATH_RE ONE literal
# string: --print-regex and check-safety-paths.sh's expand_gate read it whole.
#
# Bash only, and correct on macOS /bin/bash 3.2. No `set -u` (an empty array expansion
# aborts on 3.2) and no `pipefail` (an `echo | grep -q` arm killed by SIGPIPE would read
# as a missed arm — an under-trigger).

if [ -z "${BASH_VERSION:-}" ]; then
  echo "🛑 b-close-gate-plan: run this with bash (bash $0 …), not sh or zsh." >&2
  exit 2
fi

SAFETY_PATH_RE='^app/(src/features/(assessment|consent|crisis|guidance|journal|practices/dailyloop)|src/features/insights/(components/|screens/InsightsScreen\.tsx)|src/features/home/screens/CleanHomeScreen\.tsx|src/features/learn/practices/(PracticeTimerScreen|ReflectionTimerScreen|BodyScanScreen|GuidedBodyScanScreen|SortingPracticeScreen|PracticeCompletionScreen|shared/PracticeToggleButton|shared/usePracticeCompletion)\.tsx|src/features/practices/screens/PracticeLibraryScreen\.tsx|src/features/profile/screens/(DeleteAccountScreen|ProfileScreen|ExportDataScreen|PrivacyDataScreen)\.tsx|src/features/practices/shared/components/(HapticsOptInPrompt|ResumeSessionModal|BreathingCircle)\.tsx|src/features/practices/shared/haptics/|src/features/practices/shared/useIsFocusedSafe\.ts|src/core/services/security|src/core/services/speech/|src/core/services/logging/ExternalErrorReporter\.ts|src/core/navigation/|src/core/hooks/|src/core/components/(ThresholdEducationModal|BugReportOverlay)\.tsx|src/core/components/accessibility/(RadioGroup|FocusManager)\.tsx|src/core/config/e2eSeed\.ts|src/core/stores/(consentStore|bugReportStore)\.ts|src/core/services/supabase/SupabaseService\.ts|src/core/services/data-retention/|App\.tsx|src/core/analytics/PostHogProvider\.tsx|plugins/|patches/|\.maestro/|app\.json|ios/.*Info\.plist)'

die() { echo "🛑 b-close-gate-plan: $*" >&2; exit 2; }

WT=""; BASE_REF="origin/development"; RANGE=""; MODE="plan"; BASE_SET=""
while [ $# -gt 0 ]; do
  case "$1" in
    --worktree) [ $# -ge 2 ] || die "--worktree needs a path"; WT="$2"; shift 2 ;;
    --base)     [ $# -ge 2 ] || die "--base needs a ref"; BASE_REF="$2"; BASE_SET=1; shift 2 ;;
    --range)    [ $# -ge 2 ] || die "--range needs A..B"; RANGE="$2"; shift 2 ;;
    --candidates-only) MODE="candidates" ; shift ;;
    --plan-path)       MODE="plan-path"  ; shift ;;
    --check-plan)      MODE="check-plan" ; shift ;;
    --print-regex)     MODE="print-regex"; shift ;;
    -h|--help) sed -n '2,/^$/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "unknown argument: $1" ;;
  esac
done

if [ "$MODE" = "print-regex" ]; then
  printf '%s\n' "$SAFETY_PATH_RE"
  exit 0
fi
[ -z "$RANGE" ] || [ "$MODE" = "candidates" ] || die "--range is only valid with --candidates-only"
[ -z "$RANGE" ] || [ -z "$BASE_SET" ] || die "--range and --base are mutually exclusive"

# --worktree is REQUIRED and must BE the git toplevel (crisis ruling). Defaulting to the
# toplevel of the cwd is the fail-open: a leaked shared core.worktree resolves every
# worktree to ~/dev/being (`_bare`), which has no merge base, so the plan reads
# INAPPLICABLE and the gate is skipped. The mapping also reads the WORKING TREE
# (`[ -f "$f" ]`, app/.maestro), relative to the cwd — hence the cd.
[ -n "$WT" ] || die "--worktree <absolute path> is required"
case "$WT" in /*) ;; *) die "--worktree must be absolute: $WT" ;; esac
[ -d "$WT" ] || die "--worktree is not a directory: $WT"
WT_REAL="$(cd "$WT" && pwd -P)" || die "cannot enter $WT"
TOP="$(git -C "$WT" rev-parse --show-toplevel 2>/dev/null)" || die "$WT is not inside a git worktree"
TOP_REAL="$(cd "$TOP" && pwd -P)" || die "cannot enter $TOP"
if [ "$WT_REAL" != "$TOP_REAL" ]; then
  die "--worktree $WT resolves to git toplevel $TOP_REAL, not itself.
   Either pass the worktree root, or a shared core.worktree has leaked
   (git config --show-origin core.worktree) — gating that tree would read the wrong diff."
fi
cd "$WT_REAL" || die "cannot cd into $WT_REAL"
WT="$WT_REAL"

[ -n "${TMPDIR:-}" ] || die "TMPDIR is unset — the result file has nowhere safe to go (never the worktree)"
PLAN_DIR="${TMPDIR%/}/b-close-gate-plan"
PLAN_FILE="$PLAN_DIR/$(printf '%s' "$WT" | sed 's/[^A-Za-z0-9._-]/_/g').env"
if [ "$MODE" = "plan-path" ]; then
  printf '%s\n' "$PLAN_FILE"
  exit 0
fi

HEAD_SHA="$(git rev-parse --verify -q HEAD)" || die "HEAD does not resolve in $WT"

# ---------------------------------------------------------------------------
# --check-plan: the consumers' freshness gate. A plan describes ONE tree; Step 2.5.0/3.1
# merges and any later commit move HEAD, and a fetch can move the merge base. Reading a
# plan computed for another tree is the stale-plan fail-open, so refuse it here, once,
# instead of trusting every consuming block to re-derive the comparison.
# ---------------------------------------------------------------------------
if [ "$MODE" = "check-plan" ]; then
  [ -f "$PLAN_FILE" ] || die "no gate plan for $WT — run Step 2.5.1 (this script, no mode flag) first"
  CHECK="$(
    PLAN_VERSION=""; PLAN_WORKTREE=""; PLAN_HEAD=""; PLAN_MERGE_BASE=""; PLAN_BASE_REF=""; INAPPLICABLE=""
    . "$PLAN_FILE" >/dev/null 2>&1 || { echo "unreadable"; exit 0; }
    [ "$PLAN_VERSION" = 1 ] || { echo "version '$PLAN_VERSION'"; exit 0; }
    [ "$PLAN_WORKTREE" = "$WT" ] || { echo "it was computed for $PLAN_WORKTREE"; exit 0; }
    [ "$PLAN_HEAD" = "$HEAD_SHA" ] || { echo "HEAD moved: plan ${PLAN_HEAD:0:12}, tree ${HEAD_SHA:0:12}"; exit 0; }
    mb="$(git merge-base "$PLAN_BASE_REF" HEAD 2>/dev/null)"
    if [ -n "$INAPPLICABLE" ]; then
      [ -z "$mb" ] || { echo "it was INAPPLICABLE but $PLAN_BASE_REF now shares history"; exit 0; }
    else
      [ "$PLAN_MERGE_BASE" = "$mb" ] || { echo "the merge base moved: plan ${PLAN_MERGE_BASE:0:12}, now ${mb:0:12}"; exit 0; }
    fi
    echo ok
  )"
  [ "$CHECK" = ok ] || die "stale gate plan ($CHECK) — re-run Step 2.5.1 before gating this tree"
  printf '%s\n' "$PLAN_FILE"
  exit 0
fi

# ---------------------------------------------------------------------------
# --candidates-only: /b-batch Step 3.2 (tiering) and Step 2.5.4's incoming re-check.
# Exactly the two pre-filter signals /b-batch used to compute from its own copy of the
# grep: the path set (test files excluded) and the crisis content detector. No inert
# filter, no INFRA-531, no mapping — b-close re-runs the full plan and is the authority.
# Unlike that copy, every git call is checked: a failed diff is exit 2, never "empty".
# ---------------------------------------------------------------------------
if [ "$MODE" = "candidates" ]; then
  if [ -n "$RANGE" ]; then
    case "$RANGE" in
      *...*) die "--range takes A..B (two dots), not A...B" ;;
      ?*..?*) FROM="${RANGE%%..*}"; TO="${RANGE#*..}" ;;
      *) die "--range takes A..B, got: $RANGE" ;;
    esac
    git rev-parse --verify -q "$FROM^{commit}" >/dev/null || die "--range: $FROM does not resolve"
    git rev-parse --verify -q "$TO^{commit}"   >/dev/null || die "--range: $TO does not resolve"
  else
    FROM="$(git merge-base "$BASE_REF" HEAD 2>/dev/null)" || \
      die "no merge base between $BASE_REF and HEAD — an unfetched or broken ref, not a clean diff"
    TO="HEAD"
  fi
  NAMES="$(git diff --name-only "$FROM" "$TO")" || die "git diff --name-only $FROM $TO failed"
  CAND="$(printf '%s\n' "$NAMES" | grep -vE '(__tests__/|\.test\.|\.spec\.)' | grep -E "$SAFETY_PATH_RE" || true)"
  PATCH="$(git diff "$FROM" "$TO" -- 'app/**/*.tsx' 'app/**/*.ts' \
    ':(exclude)app/**/__tests__/**' ':(exclude)app/**/*.test.*' ':(exclude)app/**/*.spec.*')" || \
    die "git diff $FROM $TO failed"
  CRISIS="$(printf '%s\n' "$PATCH" | grep -E '^[+-].*CollapsibleCrisisButton' \
    | grep -vE '^[+-][[:space:]]*(//|\*|/\*)' || true)"
  echo "Range: $FROM..$TO"
  if [ -n "$CAND" ]; then
    echo "SAFETY_CANDIDATES:"; printf '%s\n' "$CAND" | sed 's/^/  /'
  else
    echo "SAFETY_CANDIDATES: (none)"
  fi
  if [ -n "$CRISIS" ]; then
    echo "CRISIS_HOST_CHANGED:"; printf '%s\n' "$CRISIS" | sed 's/^/  /'
  else
    echo "CRISIS_HOST_CHANGED: (none)"
  fi
  if [ -n "$CAND$CRISIS" ]; then
    echo "🛡️  Safety-surface candidates present."
  else
    echo "✅ No safety-surface candidates."
  fi
  exit 0
fi

# ---------------------------------------------------------------------------
# The plan. Clear any earlier result first: from here, every exit but the final one
# leaves no file, and a consumer refuses a missing file.
# ---------------------------------------------------------------------------
mkdir -p "$PLAN_DIR" 2>/dev/null || die "cannot create $PLAN_DIR"
[ -w "$PLAN_DIR" ] || die "$PLAN_DIR is not writable"
rm -f "$PLAN_FILE" || die "cannot remove the stale plan $PLAN_FILE"
[ ! -e "$PLAN_FILE" ] || die "the stale plan $PLAN_FILE survived rm"

INAPPLICABLE=""
FLOWS=()
FULL_SUITE=""
DYNAMIC_TYPE_FLOWS=()

# ===========================================================================
# Step 2.5.1 — Detect safety-surface changes (moved from b-close.md, INFRA-727)
# ===========================================================================
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
if ! MERGE_BASE=$(git merge-base "$BASE_REF" HEAD 2>/dev/null); then
  # INFRA-727 (crisis ruling): INAPPLICABLE is legitimate only on a tree with no app/.
  # A worktree carrying app/ shares development's history by construction, so a missing
  # merge base there is a broken or unfetched ref — refuse, never read it as "no diff".
  [ -d app ] && die "no merge base between $BASE_REF and HEAD, yet this worktree has app/ —
   a broken or unfetched ref, not an orphan branch. git fetch origin and re-run."
  echo "ℹ️  No merge base with origin/development — this branch shares no history"
  echo "    with the app tree (e.g. _bare, which carries only .claude/ tooling)."
  echo "    Phase 2.5 is INAPPLICABLE, not passing: there is no app diff to classify."
  SAFETY_CANDIDATES=""
  INAPPLICABLE=1
else
SAFETY_CANDIDATES=$(git diff --name-only "$MERGE_BASE" HEAD | \
  grep -vE '(__tests__/|\.test\.|\.spec\.)' | \
  grep -E "$SAFETY_PATH_RE" || true)
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
    exit 2  # INFRA-727: a tooling error (was 1); every non-zero refuses the close
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
  echo "          SAFETY_PATH_RE in this script and give it a Step 2.5.3 flow arm, a case in" >&2
  echo "          test-b-close-gate-plan.sh and a decision-table row. Record the ruling's" >&2
  echo "          prose in /Users/max/dev/being/.claude/docs/safety-path-rulings.md (INFRA-726)." >&2
  exit 1
fi
# INFRA-723 — Steps 2.5.3–2.5.5 live in a separate file so a gate-less close never loads
# them. This line is the only pointer an agent reading top-down is guaranteed to see.
if [ -n "$SAFETY_CHANGED" ] || [ -n "$CRISIS_HOST_CHANGED" ]; then
  echo "🔒 GATE REQUIRED — Read /Users/max/dev/being/.claude/docs/b-close-gate.md"
fi

GATE_REQUIRED=""
if [ -n "$SAFETY_CHANGED" ] || [ -n "$CRISIS_HOST_CHANGED" ]; then
  GATE_REQUIRED=1
elif [ -z "$INAPPLICABLE" ]; then
  echo "ℹ️  No safety-surface changes detected — skipping Maestro e2e gate"
fi

# ===========================================================================
# Step 2.5.3 — Map changed paths to scoped flow(s) (moved from b-close-gate.md,
# INFRA-727). Runs only on an active gate, exactly as the skill sequenced it.
# ===========================================================================
if [ -n "$GATE_REQUIRED" ]; then
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
# DEBUG-546 — safety-dynamic-type flows. Never merged into FLOWS: e2e-safety.sh runs the
# tagged suite at the DEFAULT content size, and these must run through e2e-dynamic-type.sh.
DYNAMIC_TYPE_FLOWS=()
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
#   2. core/services/security/** EXCEPT EncryptionService / SecureStorageService /
#      DeepLinkValidationService — monitoring / metrics / network / protocol layer.
#      Encryption + SecureStorage ARE boot/render-critical (wellness data decrypts at
#      assessment render; encryption init gates app boot), and DeepLinkValidationService
#      decides deep-link delivery, 988 included (DEBUG-636), so all three STAY.
# If you ever wire a NEW security/crisis service into app boot or the crisis overlay's
# import graph, DROP it from the carve-out so its changes re-arm the smoke test.
RENDER_BOOT_RELEVANT=$(echo "$SAFETY_CHANGED" | awk '
  # DEBUG-596 (crisis ruling): crisisTapTrace.ts is NOT a backend service. It is tap-path
  # code in the crisis overlay import graph — CollapsibleCrisisButton.tsx:85/:322 and
  # CrisisKeyboardAccessory.tsx:67/:107 call beginCrisisTap() on the tap frame ahead of the
  # navigate, and CrisisResourcesScreen.tsx:290 / openCrisisUrl.ts:50,:82 close the mark.
  # The carve-out below names that exit condition itself. Keep this rule FIRST — awk takes
  # the first matching rule.
  /src\/features\/crisis\/services\/crisisTapTrace\.ts/ { print; next }
  /src\/features\/crisis\/services\// { next }
  # DEBUG-636 (crisis ruling): the enforcing allowlist decides whether being://crisis is
  # delivered — not monitoring. Keep this ahead of the security carve-out below.
  /src\/core\/services\/security\/DeepLinkValidationService\.ts/ { print; next }
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
# DEBUG-559: App.tsx and PostHogProvider.tsx are ANCESTORS of every 988 affordance. A
# consent-driven element-type swap there destroyed the whole crisis subtree, and
# SafeAreaProvider (no initialMetrics) renders nothing until its native insets land — so the
# remount was a BLANK screen, not a FAB gap. These are the flows that drive the
# consent-granting surfaces, plus the reachability fail-safe.
if echo "$RENDER_BOOT_RELEVANT" | grep -qE '^app/(App\.tsx|src/core/analytics/PostHogProvider\.tsx)$'; then
  FLOWS+=("deeplink-consent-gate" "reconsent-stale" "reconsent-stale-ineligible" "crisis-button-reachability")
  echo "🌳 Crisis-subtree ancestor changed. NECESSARY, NOT SUFFICIENT: the gate build seeds"
  echo "   past onboarding (EXPO_PUBLIC_E2E_SEED_ONBOARDED=true), so NO sim flow reaches the"
  echo "   onboarding privacy-step grant; and Maestro polls the hierarchy, so it can sample"
  echo "   the remount window but never bound it. A zero-frame window is jest's to pin and an"
  echo "   attended Release session's to measure (DEBUG-559)."
fi
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
# FEAT-664: loadConsent fires the legal-gate mirror hydration on the boot path; a hung read is jest-only (never-resolve pin).
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/core/stores/consentStore\.ts' && \
  FLOWS+=("deeplink-consent-gate" "reconsent-stale" "reconsent-stale-ineligible")
# DEBUG-636 (crisis ruling): DeepLinkValidationService's allowlist decides whether an
# external link — being://crisis included — is delivered, and holds the single-code
# invariant isRateLimitedCrisisIntent needs. These are the flows that open a deep link cold
# (crisis, then daily). NECESSARY, NOT SUFFICIENT: the blocked case is a pure-function
# contract no flow observes; deepLinkPathEnforcement.test.ts pins it.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/core/services/security/DeepLinkValidationService\.ts' && \
  FLOWS+=("deeplink-consent-gate" "daily-loop-deeplink")
# INFRA-568 (crisis ruling): SupabaseService.ts owns the ONLY writer of `crisis_detected`
# to analytics_events, and trackCrisisDetection runs inside the synchronous frame
# handleCrisisDetection awaits. These four are exactly INFRA-411's own enumeration of the
# flows that reach crisis DETECTION rather than merely the crisis button.
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/core/services/supabase/SupabaseService\.ts'; then
  FLOWS+=("q9-single-alert" "phq9-severe-completion" "gad7-severe" "journal-crisis-scan")
  echo "📊 SupabaseService changed — it owns the crisis audit sink. NECESSARY, NOT SUFFICIENT:"
  echo "   the gate build SUPPRESSES egress (INFRA-411 returns before the insert when"
  echo "   EXPO_PUBLIC_E2E_SEED_ONBOARDED=true), and every flow launches with clearState, so"
  echo "   NO flow can observe delivery, rotation, or any cross-midnight/idle boundary. What"
  echo "   these four DO cover is the one gate-visible failure mode: new synchronous work in"
  echo "   the awaited frame shows up as the intervention failing to surface or a timeout."
  echo "   Delivery is INFRA-412's attended .env.production measurement."
fi
# DEBUG-705 (crisis ruling): core/services/data-retention/ decides which PHQ-9 / GAD-7 records
# the guidance gate's suppression can still read, and its launch sweep rewrites the screening
# blob at boot, concurrently with assessment flows. DIRECTORY-level: DataRetentionService.ts,
# assessmentRetention.ts and the index.ts barrel, all reviewed.
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/core/services/data-retention/'; then
  FLOWS+=("q9-single-alert" "phq9-severe-completion" "gad7-severe")
  echo "🗂️  data-retention changed — NECESSARY, NOT SUFFICIENT: every flow launches with"
  echo "   clearState, so no flow seeds an aged screening. Tier selection and no-resurrection"
  echo "   are jest-owned (assessmentRetention.livePath.privacy, interventionTierScore,"
  echo "   retentionNoResurrection). These flows witness only a boot-time prune breaking or"
  echo "   hanging a live screening."
fi
# MAINT-750 (crisis ruling): RadioGroup is the PHQ-9 / GAD-7 answer control — its onPress ->
# onValueChange is the only path a Q9 answer takes into answerQuestion's inline detection, and
# q9-single-alert taps its testIDs. FocusManager's Focusable wraps that answer group and both
# crisis banners on the gated assessment hosts. Both are shared primitives a gated host routes
# through, which INFRA-531's import alarm cannot see. FILE-level: the rest of
# core/components/accessibility/ (AccessibleButton, the barrel) is unreviewed.
if echo "$RENDER_BOOT_RELEVANT" | grep -qE 'src/core/components/accessibility/(RadioGroup|FocusManager)\.tsx'; then
  FLOWS+=("q9-single-alert" "phq9-severe-completion" "gad7-severe")
  echo "🔘 RadioGroup/FocusManager changed — the flows pin the TAP path a Q9 answer takes."
  echo "   NECESSARY, NOT SUFFICIENT: RadioGroup's keyboard handler is reachable only from jest"
  echo "   (onKeyPress on a Pressable is not emitted on iOS/Android), so its stale-handler"
  echo "   contract is jest-owned (accessibility/__tests__, EnhancedAssessmentQuestion.test)."
fi
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
# the dir's other crisis-bearing files each have their own clause, and ProfileStackNavigator
# is already covered by CRISIS_HOST_CHANGED, so a directory clause would buy nothing and
# charge a sim build to every Profile edit. It also carries DEBUG-653's FAB clearance on
# delete-account-button and delete-confirm-input (the DEBUG-547 shape); its falsifier is
# the host's jest sweep.
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/profile/screens/DeleteAccountScreen\.tsx'; then
  FLOWS+=("crisis-button-reachability")
  echo "⌨️  DeleteAccountScreen changed — it consumes crisisInputAccessory, and its button"
  echo "   and confirm input carry DEBUG-653's FAB clearance. The flow arm is"
  echo "   NECESSARY BUT NOT SUFFICIENT: crisis-button-reachability reaches this screen and"
  echo "   taps through to CrisisResources, but never types into delete-confirm-input, so it"
  echo "   exercises the UNOCCLUDED overlay and cannot observe the accessory contract."
  echo "   The keyboard-up mechanism is pinned on the sim by crisis-keyboard-reachability"
  echo "   (one runtime site; this screen is covered by construction via CrisisTextInput)."
  echo "   It taps element CENTRES, so the clearance's falsifier is the jest every-y sweep."
fi
# DEBUG-577 (crisis ruling E): ExportDataScreen owns a registered full-screen presenter
# call — Sharing.shareAsync — MEASURED to remove every 988 affordance for as long as the
# share sheet is up (the hierarchy carries zero app-owned nodes, and a matched-pair
# coordinate tap reaches CrisisResources with the sheet down and not with it up). Same
# shape as ExternalErrorReporter, which is already gated, and INFRA-571 established this
# site is STRICTLY MORE REACHABLE: the JSON export path is always on and never flag-gated,
# where the Sentry path is bounded by bug_reporting being off in the public build.
# FILE-level, not features/profile/screens/: the dir's legal/settings/account/backup
# members carry no crisis surface, and those that do are listed individually. It also
# carries DEBUG-653's FAB clearance on export-data-button (the DEBUG-547 shape).
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/profile/screens/ExportDataScreen\.tsx'; then
  FLOWS+=("crisis-button-reachability")
  echo "📤 ExportDataScreen changed — it calls Sharing.shareAsync, a measured zero-988"
  echo "   window. The flow arm is NECESSARY BUT NOT SUFFICIENT: crisis-button-reachability"
  echo "   walks to export-data-screen and taps crisis-button-root there, but NO sim flow in"
  echo "   the gate opens the share sheet, so it proves only that the route still renders the"
  echo "   overlay with the sheet DOWN. The occlusion window itself is verified by DEBUG-577's"
  echo "   measurement and by nothing in the suite. Re-measure with:"
  echo "   maestro test app/.maestro/export-share-sheet-occlusion.yaml (booted 375x667)"
  echo "   export-data-button also carries DEBUG-653's FAB clearance; the flow taps element"
  echo "   CENTRES, so that clearance's falsifier is the jest every-y sweep."
fi
# DEBUG-533: ProfileScreen hosts the second entry to showFeedbackForm(). It gets a real arm
# because crisis-button-reachability already walks the Profile tab and every subscreen
# depth, so it costs nothing and proves the overlay still renders there.
# ExternalErrorReporter is armed by the FEAT-570 block below. Since FEAT-570 the form is
# first-party, so a sim flow can open it; it is no longer a notice. It also carries
# DEBUG-653's FAB clearance on the Onboarding Setup footer link (the DEBUG-547 shape).
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'features/profile/screens/ProfileScreen\.tsx'; then
  FLOWS+=("crisis-button-reachability")
  echo "🪟 ProfileScreen changed — it hosts the second entry to showFeedbackForm(). The arm"
  echo "   is NECESSARY BUT NOT SUFFICIENT: the flow proves Profile still renders the root"
  echo "   overlay, but never opens the widget, so it cannot observe the occlusion itself."
  echo "   Its footer link also carries DEBUG-653's FAB clearance; the flow taps element"
  echo "   CENTRES, so that clearance's falsifier is the jest every-y sweep."
fi
# DEBUG-653: PrivacyDataScreen clears the FAB with a CRISIS_BUTTON_EXCLUSION_RECT margin on
# profile-card-delete, its last control at max scroll — the DEBUG-547 shape. The flow already
# walks Privacy & Data to that card, so the arm is free. FILE-level: the dir's other
# crisis-bearing files each have their own clause.
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/profile/screens/PrivacyDataScreen\.tsx'; then
  FLOWS+=("crisis-button-reachability")
  echo "🛡️  PrivacyDataScreen changed — profile-card-delete carries DEBUG-653's FAB clearance."
  echo "   The arm is NECESSARY BUT NOT SUFFICIENT: Maestro taps element CENTRES, which never"
  echo "   enter the FAB's column, so the falsifier is the jest every-y sweep in"
  echo "   PrivacyDataScreen.accessibility.test.tsx."
fi
if echo "$RENDER_BOOT_RELEVANT" | grep -qE 'core/services/logging/ExternalErrorReporter\.ts|core/components/BugReportOverlay\.tsx|core/stores/bugReportStore\.ts'; then
  FLOWS+=("bug-report-crisis-reachability")
  FLOWS+=("bug-report-suppressed-route")
  echo "🪟 The bug-report surface changed. Since FEAT-570 this is a FIRST-PARTY form in"
  echo "   rootOverlaySlot, so a sim flow CAN open it — which is why these are arms and no"
  echo "   longer a notice. ⚠️ Neither flow may submit: the gate build resolves a live"
  echo "   production Sentry DSN and captureFeedback has no egress suppression."
  echo "   NECESSARY BUT NOT SUFFICIENT: the shake entry point is armed at the app root and"
  echo "   is NOT sim-drivable — Maestro 2.6.0 has no shake command. Its verdict is an"
  echo "   attended device session: shake on AssessmentFlow and on LegalGate, capture a"
  echo "   hierarchy dump, and confirm the 988 affordance survives."
fi
# core/hooks/ is gated as a DIRECTORY (3 of 5 files are crisis-critical; see CLAUDE.md).
# journal-crisis-scan is the only keyboard-up flow in the tagged suite and reaches
# useKeyboardFrameHeight through VoiceReflectionScreen, so it is the scoped target. The two
# hooks it CANNOT witness get instructions, not a full suite — same precedent as 988 below.
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/core/hooks/'; then
  FLOWS+=("journal-crisis-scan")
  echo "⌨️  A core/hooks/ file changed — these decide crisis-affordance placement and"
  echo "   visibility. journal-crisis-scan covers the keyboard-up inset path. Two surfaces"
  echo "   it cannot witness, both outside the tagged suite:"
  echo "     npm run e2e:safety:keyboard-reachability (sim — the reachability pin on"
  echo "       useKeyboardOccludesCrisisButton; journal-crisis-scan above pins the same"
  echo "       predicate on the journal surface, INFRA-594). The device flow refuses,"
  echo "       exit 5 — DEBUG-589."
  echo "     npm run e2e:safety:xxxl                 (dynamic-type — DEBUG-507/516's pin"
  echo "       on the journal save inset)"
fi
# The two insights composers are DEBUG-406 conversion sites rendering into the root overlay
# slot. WeeklyReflectionComposer now has a real sim flow (INFRA-532): crisis-button-reachability
# taps through it, reachable because e2eSeed.ts seeds four non-'daily' check-ins past
# WeeklyReflectionCard's MIN_CHECK_INS_TO_SHOW gate. SessionNoteComposer stays notice-only —
# it is flag-dark in the gate build, and an arm that cannot be satisfied is the shape that
# trains --skip-e2e.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/insights/components/' && {
  FLOWS+=("crisis-button-reachability")
  echo "🪟 insights/components changed — WeeklyReflectionComposer is a DEBUG-406 conversion site. The Insights block"
  echo "   of crisis-button-reachability taps through it (occlusion arm + mis-tap arm)."
  echo "   NECESSARY, NOT SUFFICIENT: Maestro taps element CENTRES, which never enter the"
  echo "   crisis button's contested column, so a marginal action-row geometry regression is"
  echo "   invisible to it. CI-side pin: __tests__/safety/modalOcclusionConversions.test.tsx"
  echo "   NOT covered by any runnable flow: the keyboard-up path."
  echo "     crisis-keyboard-accessory does not reach it: DEBUG-574 re-pointed that device"
  echo "     flow to DailyLoop, and the device path cannot run anyway (DEBUG-589)."
}
# FEAT-669: InsightsScreen ends its scroll content in a CRISIS_BUTTON_EXCLUSION_RECT.top spacer
# (the DEBUG-620 shape). The flow already walks the Insights tab, so the arm is free.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/insights/screens/InsightsScreen\.tsx' && {
  FLOWS+=("crisis-button-reachability")
  echo "📐 InsightsScreen changed — its trailing spacer keeps every control clear of the crisis"
  echo "   FAB's band at maximum scroll. NECESSARY, NOT SUFFICIENT: Maestro taps element"
  echo "   CENTRES; the falsifier is the spacer pin in InsightsScreen.accessibility.test.tsx."
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
# DEBUG-546: daily-loop-ax5-entry walks Home -> depth picker -> beat 1 -> Sphere Sovereignty
# -> CrisisResources at AX5 — including DEBUG-469's CRISIS_FAB_CLEARANCE and DEBUG-560's 988
# fold, which centre-tapping default-size flows cannot see. Run in Step 2.5.5, not printed.
echo "$RENDER_BOOT_RELEVANT" | grep -qE 'src/features/practices/dailyloop|src/features/home/screens/CleanHomeScreen\.tsx|src/features/crisis/screens/CrisisResourcesScreen\.tsx|\.maestro/daily-loop-ax5-entry\.yaml' && \
  DYNAMIC_TYPE_FLOWS+=("daily-loop-ax5-entry")
# DEBUG-629: daily-loop-ax5-virtuous carries on to beat 3, which NOTHING covered at an
# accessibility size — daily-loop-quick-depth reaches it only at the default size, and
# ax5-entry stops at Sphere Sovereignty. It also ends with the ✕ tap, the regression test
# for a MEASURED AX5 failure (the header's title cell hit-stole daily-loop-exit, so the
# loop's only exit on beat 1 could not be tapped). Same trigger set as ax5-entry: the
# header is shared by every beat, so a dailyloop change can move either flow.
#
# It does NOT fire on a `.maestro/daily-loop-ax5-entry.yaml`-only diff, and that is
# deliberate: an ax5-entry edit should not charge a second AX5 flow to a close that has
# nothing to do with beat 3. Each dynamic-type flow is armed by its own subject.
#
# FlowProgressIndicator.tsx is deliberately NOT a trigger, though it renders the counter
# whose cap holds the band. Its falsifier is the jest pin on the rendered
# maxFontSizeMultiplier, which runs in CI on every commit — Maestro cannot read a font
# multiplier at all, so an arm here would buy nothing and would charge an AX5 build to
# every unrelated practice's progress-bar edit. It would also be the first clause naming a
# path with no Protected Paths row, and check-safety-paths.sh only walks Step 2.5.1's grep,
# so nothing would have reconciled it.
echo "$RENDER_BOOT_RELEVANT" | grep -qE 'src/features/practices/dailyloop|\.maestro/daily-loop-ax5-virtuous\.yaml' && \
  DYNAMIC_TYPE_FLOWS+=("daily-loop-ax5-virtuous")
# DEBUG-586: the two centred-card overlays in practices/shared/components size their
# paddingBottom from CRISIS_BUTTON_RESERVED_BAND, so an under-reserved band puts their
# controls under a zIndex-9999 FAB — a crisis FALSE POSITIVE, the DEBUG-547 shape. They
# map to DIFFERENT flows, hence two clauses. Both are NECESSARY, NOT SUFFICIENT: no
# Maestro assertion can read a paddingBottom, and the flows tap element CENTRES. The
# falsifier for both is the jest style assertion pinned to the imported constant.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'practices/shared/components/ResumeSessionModal' && \
  FLOWS+=("daily-loop-quick-depth")
# DEBUG-587 (crisis ruling): shared/haptics/ routes BOTH the tactile and the paired-speech
# channels, and BreathingCircle speaks every breath phase through announceForAccessibility.
# Neither imports from features/crisis/, so INFRA-531's rule cannot see them, and practices/
# is exempt outside dailyloop/ — the hand-maintained row is the only control.
if echo "$RENDER_BOOT_RELEVANT" | grep -qE 'practices/shared/haptics/|practices/shared/components/BreathingCircle\.tsx|practices/shared/useIsFocusedSafe\.tsx?'; then
  FLOWS+=("crisis-button-reachability")
  echo "🔇 A practice cue/breath surface changed — it decides whether practice output can"
  echo "   reach a crisis screen. NOTICE-ONLY by construction: eas.json's e2e-sim profile"
  echo "   sets practice_haptics:false, so schedulerNeeded is false in the gate build and NO"
  echo "   flow can render a cue. The arm proves only that the surrounding crisis paths still"
  echo "   reach CrisisResources. The falsifier is jest at the expo-haptics and"
  echo "   announceForAccessibility boundaries:"
  echo "     __tests__/unit/practices/haptics/crisisBlurGate.test.tsx"
fi
echo "$RENDER_BOOT_RELEVANT" | grep -q 'practices/shared/components/HapticsOptInPrompt' && {
  FLOWS+=("crisis-button-reachability")
  echo "ℹ️  DEBUG-586: HapticsOptInPrompt is FLAG-DARK in the gate build"
  echo "   (eas.json e2e-sim: practice_haptics:false; useHapticsOptIn gates on it)."
  echo "   No sim flow can render it. crisis-button-reachability proves only that the"
  echo "   surrounding crisis paths still reach CrisisResources. The band's oracle is"
  echo "   the jest style assertion in haptic-cues-accessibility.test.tsx."
}
# DEBUG-618/620/622, extended DEBUG-628/631: PracticeTimer, ReflectionTimer, BodyScan,
# GuidedBodyScan and PracticeLibrary clear the FAB with a CRISIS_BUTTON_EXCLUSION_RECT inset —
# the DEBUG-547 shape. PracticeToggleButton carries three of those insets through its style merge.
# PracticeCompletionScreen (DEBUG-678) clears Continue with a primaryButton right margin (DEBUG-682). NECESSARY, NOT SUFFICIENT: crisis-button-reachability renders none of
# them; the falsifier is jest.
if echo "$RENDER_BOOT_RELEVANT" | grep -qE 'src/features/learn/practices/(PracticeTimerScreen|ReflectionTimerScreen|BodyScanScreen|GuidedBodyScanScreen|SortingPracticeScreen|PracticeCompletionScreen|shared/PracticeToggleButton)\.tsx|src/features/practices/screens/PracticeLibraryScreen\.tsx'; then
  FLOWS+=("crisis-button-reachability")
  echo "ℹ️  DEBUG-618/620/622/628/631: a practice FAB-clearance surface changed."
  echo "   crisis-button-reachability renders none of these screens — it proves only the FAB mount."
  echo "   The falsifier is the jest geometry pin against intersectsCrisisButtonExclusion."
fi
# DEBUG-695 (crisis ruling): the completion path all five gated practice hosts share. It owns both
# "degrade, never throw" contracts on a timer callback no error boundary covers.
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/learn/practices/shared/usePracticeCompletion\.tsx'; then
  FLOWS+=("crisis-button-reachability")
  echo "🏁 usePracticeCompletion changed — the completion path shared by five gated practice hosts."
  echo "   NECESSARY, NOT SUFFICIENT: no sim flow completes a practice, so the flow proves only the"
  echo "   FAB mount. The falsifiers are the jest degrade contracts:"
  echo "     __tests__/unit/practices/practiceCompletionDegrade.contract.test.tsx"
  echo "     __tests__/unit/practices/practiceCompletionModuleId.contract.test.tsx"
fi
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
# Boot/render-critical security service: EncryptionService / SecureStorageService survive
# the RENDER_BOOT_RELEVANT carve-out above (wellness data decrypts at assessment render;
# encryption init gates app boot) → crisis-button boot/render smoke. DeepLinkValidationService
# survives it too but has its own arm above, so this match names the two files. Every OTHER
# core/services/security change (monitoring / metrics / network / protocol) was stripped
# from RENDER_BOOT_RELEVANT and is jest-owned — see the MAINT-237 narrowing note above.
# TRADEOFF (unchanged): if such a change ALSO touches assessment persistence, run
# `npm run e2e:safety` (full suite) manually.
echo "$RENDER_BOOT_RELEVANT" | grep -qE 'src/core/services/security/(EncryptionService|SecureStorageService)' && \
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
# Every flow carrying a NAMED case arm below — i.e. the ones the sim gate cannot run.
# `safety`-tagged flows are deliberately absent: they self-map through the tag check in
# the catch-all, so listing them here would be a second copy of the .maestro directory
# that has to be maintained by hand. That copy is what drifted — two safety flows were
# missing from it and silently cost a full suite each.
# Kept beside the case deliberately: BOTH drift directions stay loud — a name here with
# no arm falls to the catch-all, an arm with no name here is reported by the drift
# printer after the loop.
EXCLUDED_FLOWS="crisis-988-dial reconsent-stale-ineligible-fab-clearance daily-loop-ax5-entry
journal-record-liveness profile-voice-reflection-xxxl breathing-fps-budget
crisis-keyboard-accessory export-share-sheet-occlusion tab-label-dynamic-type-capture
daily-loop-ax5-virtuous"
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
                    echo "   ⚠️  Its Continue tap (INFRA-494) and four consent taps (INFRA-656) clear"
                    echo "       the 988 footer by DERIVATION only — re-read the helper's D0-D5"
                    echo "       before changing any tap, anchor or point:. No Maestro version can"
                    echo "       run its callers (DEBUG-589)." ;;
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
      # DEBUG-546: armed into DYNAMIC_TYPE_FLOWS by its own clause above; kept as an arm so
      # the EXCLUDED_FLOWS drift printer stays quiet and the catch-all never fires.
      echo "🔠 daily-loop-ax5-entry.yaml changed — safety-dynamic-type, so NOT in the tagged"
      echo "   suite. Step 2.5.5 runs it at AX5 through e2e-dynamic-type.sh." ;;
    daily-loop-ax5-virtuous.yaml)
      # DEBUG-629: same carve-out and same reason as ax5-entry above; armed into
      # DYNAMIC_TYPE_FLOWS by its own clause. It is the ONLY flow reaching VirtuousResponse
      # at an accessibility size, and the only one asserting the ✕ actually exits at AX5.
      echo "🔠 daily-loop-ax5-virtuous.yaml changed — safety-dynamic-type, so NOT in the"
      echo "   tagged suite. Step 2.5.5 runs it at AX5 through e2e-dynamic-type.sh." ;;
    journal-record-liveness.yaml)
      echo "🎙️  journal-record-liveness.yaml changed — safety-host-probe. It drives to"
      echo "   phase:'recording' and STOPS; the verdict is the host-side pid sample either"
      echo "   side of a MEASURED dwell, which no Maestro assertion can express. Running"
      echo "   this flow bare proves only that the record tap landed. NOT added to the run"
      echo "   set, and NOT a full-suite trigger. Validate it directly:"
      echo "   npm run e2e:safety:audio-liveness" ;;
    breathing-fps-budget.yaml)
      echo "📐 breathing-fps-budget.yaml changed — perf-device-only, and it CANNOT run:"
      echo "   DEBUG-589 established no Maestro version executes a flow on a physical"
      echo "   iPhone, so e2e-safety.sh refuses it up front (DEVICE_PATH_UNAVAILABLE,"
      echo "   exit 5). NOT added, and NOT a full-suite trigger — a sim run cannot"
      echo "   observe a device frame probe. It is dormant by design until DEBUG-589." ;;
    profile-voice-reflection-xxxl.yaml)
      echo "🔠 profile-voice-reflection-xxxl.yaml changed — safety-dynamic-type, same"
      echo "   carve-out as ax5 above. Note the SIZE differs: this one runs at"
      echo "   extra-extra-extra-large (largest NON-accessibility step) via"
      echo "   E2E_DYNAMIC_TYPE_SIZE, not the wrapper's AX5 default. Validate it directly:"
      echo "   npm run e2e:safety:xxxl" ;;
    tab-label-dynamic-type-capture.yaml)
      echo "🔠 tab-label-dynamic-type-capture.yaml changed — safety-dynamic-type, and a"
      echo "   CAPTURE HARNESS: Maestro asserts presence, not clipping, so running it can"
      echo "   prove nothing. NOT added. Size-agnostic by design — run both endpoints:"
      echo "   npm run e2e:capture:tabbar-ax1 && npm run e2e:capture:tabbar-ax5" ;;
    export-share-sheet-occlusion.yaml)
      echo "📤 export-share-sheet-occlusion.yaml changed — safety-occlusion-measurement."
      echo "   It PINS A DEBT STATE, not a contract: its load-bearing assertion is that the"
      echo "   988 affordance is UNREACHABLE behind the share sheet, so it stays green on the"
      echo "   day the debt is discharged. NOT added to the run set, and NOT a full-suite"
      echo "   trigger — it also leaves an open share sheet, state Maestro does not reliably"
      echo "   clear, which per DEBUG-422 reds LATER flows against a healthy app. Run it alone"
      echo "   on a booted 375x667 device, or delete it if the occlusion is ever remedied." ;;
    crisis-keyboard-accessory.yaml)
      # DEBUG-590 (crisis ruling): the reachability contract MIGRATED to a sim flow, so an
      # edit here runs that flow. The device path itself refuses with exit 5 (DEBUG-589).
      FLOWS+=("crisis-keyboard-reachability")
      echo "⌨️  crisis-keyboard-accessory.yaml changed — safety-device-only, and the device"
      echo "   path is unavailable (DEBUG-589). Running its migrated sim half instead:"
      echo "   crisis-keyboard-reachability. The hardware residual is INFRA-591's." ;;
    # Self-map on the TAG, not the filename — which is what the "not a name transform"
    # caveat above asks for: a FILENAME transform gets helpers, dynamic-type and
    # device-only flows wrong, and the tag is what distinguishes each. It is also what
    # e2e-safety.sh selects on, so this cannot disagree with the runner. One arm per
    # flow could: bug-report-crisis-reachability and bug-report-suppressed-route were
    # `safety`-tagged with no arm and gated the full suite instead of running.
    *)
      if [ "$(mflow_tag "$(basename "$f")")" = "safety" ]; then
        FLOWS+=("$(basename "$f" .yaml)")
      else
        # INFRA-517 / INFRA-428: neither `safety` nor a named arm is a shape nobody has
        # reasoned about — bias safe, but NAME it. Print the tag: dispatch keys on it, so
        # an unexpected tag IS the diagnosis.
        echo "🛡️  unmapped flow $(basename "$f") (tag: $(mflow_tag "$(basename "$f")")) —"
        echo "    neither \`safety\` nor a named arm. Gating full suite."
        echo "    Give it an arm (and add it to EXCLUDED_FLOWS) to scope it properly."
        FULL_SUITE=1
      fi ;;
  esac
done <<< "$MAESTRO_CHANGED"
# INFRA-517 drift printer. Runs whenever the loop ran at all, not only on a catch-all hit:
# an arm set that only reports drift for files someone happens to edit is not a check.
if [ -n "$MAESTRO_CHANGED" ]; then
  # Collapse the newlines out of EXCLUDED_FLOWS first: the membership test is
  # space-delimited, so a name sitting at a line break would never match itself.
  MAPPED_NORM=" $(echo $EXCLUDED_FLOWS) "
  for ff in "$E2E_DIR"/[!_]*.yaml; do
    [ -e "$ff" ] || continue
    nn="$(basename "$ff" .yaml)"
    # A `safety` flow needs no arm — it self-maps on its tag. Only a flow that is
    # neither `safety` nor named is unreasoned-about, and only that is drift now.
    [ "$(mflow_tag "$nn.yaml")" = "safety" ] && continue
    case "$MAPPED_NORM" in *" $nn "*) ;; *)
      echo "⚠️  arm-set drift: $nn.yaml carries tag \`$(mflow_tag "$nn.yaml")\` with no case arm (falls to full suite)." ;;
    esac
  done
  for nn in $EXCLUDED_FLOWS; do
    [ -e "$E2E_DIR/$nn.yaml" ] || echo "⚠️  arm-set drift: case arm \`$nn\` names no file in $E2E_DIR."
    # An excluded flow that becomes plain `safety` would now self-map, and its named arm
    # would shadow that silently — the arm wins, because a case matches in order.
    [ -e "$E2E_DIR/$nn.yaml" ] && [ "$(mflow_tag "$nn.yaml")" = "safety" ] && \
      echo "⚠️  arm-set drift: \`$nn\` is tagged \`safety\` but still has an exclusion arm shadowing it."
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
if [ ${#FLOWS[@]} -eq 0 ] && [ -z "$FULL_SUITE" ] && [ ${#DYNAMIC_TYPE_FLOWS[@]} -eq 0 ]; then
  if [ -n "$RENDER_BOOT_RELEVANT" ]; then
    # NAME the substitution, for the INFRA-517 reason one screen up: a silent cap reads
    # exactly like a deliberate scope. This arm is the fail-safe for a render/boot path
    # that reached Step 2.5.1's grep but matched no Step 2.5.3 clause — the shape a newly
    # added Protected Path takes before anyone writes it an arm. check-safety-paths.sh
    # cannot catch it: it reconciles SAFETY_PATH_RE against CLAUDE.md, never the arm set,
    # and the drift printer above is flow-side (it only runs when .maestro files changed).
    # Unannounced, the operator sees an ordinary scoped run and the generic flow reads as
    # the mapped one.
    echo "🛡️  No Step 2.5.3 clause matched a render/boot-relevant change — falling back to"
    echo "    crisis-button-reachability. This is the fail-safe, NOT a scope: it proves 988"
    echo "    reachability only, and pins nothing specific to what changed:"
    echo "$RENDER_BOOT_RELEVANT" | sed 's/^/      /'
    echo "    Give these paths a Step 2.5.3 arm to scope them properly."
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
fi  # GATE_REQUIRED

# ===========================================================================
# Result file
# ===========================================================================
# Flow names are written unquoted into a NAME=(…) list that bash and zsh both source, so
# a name outside this alphabet is refused rather than escaped.
for _fl in "${FLOWS[@]}" "${DYNAMIC_TYPE_FLOWS[@]}"; do
  printf '%s\n' "$_fl" | grep -qE '^[a-z0-9-]+$' || die "flow name '$_fl' is outside [a-z0-9-]"
done
case "$FULL_SUITE" in ""|1) ;; *) die "FULL_SUITE is '$FULL_SUITE', expected empty or 1" ;; esac

# Single-quote a value; the '\'' escape means the same thing to bash and zsh.
plan_q() { printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"; }

PLAN_TMP="$(mktemp "$PLAN_DIR/.plan.XXXXXX")" || die "mktemp in $PLAN_DIR failed"
{
  echo "# b-close-gate-plan.sh result (INFRA-727). Generated — source it, never edit it."
  echo "PLAN_VERSION=1"
  echo "PLAN_WORKTREE=$(plan_q "$WT")"
  echo "PLAN_HEAD=$HEAD_SHA"
  echo "PLAN_MERGE_BASE=${MERGE_BASE:-}"
  echo "PLAN_BASE_REF=$(plan_q "$BASE_REF")"
  echo "INAPPLICABLE=$INAPPLICABLE"
  echo "GATE_REQUIRED=$GATE_REQUIRED"
  echo "FULL_SUITE=$FULL_SUITE"
  echo "FLOWS=(${FLOWS[*]})"
  echo "DYNAMIC_TYPE_FLOWS=(${DYNAMIC_TYPE_FLOWS[*]})"
  echo "SAFETY_CHANGED=$(plan_q "$SAFETY_CHANGED")"
  echo "CRISIS_HOST_CHANGED=$(plan_q "$CRISIS_HOST_CHANGED")"
} > "$PLAN_TMP" || { rm -f "$PLAN_TMP"; die "writing $PLAN_TMP failed"; }
mv -f "$PLAN_TMP" "$PLAN_FILE" || { rm -f "$PLAN_TMP"; die "moving the plan into $PLAN_FILE failed"; }
echo "📄 Gate plan: $PLAN_FILE"
exit 0
