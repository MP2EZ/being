#!/usr/bin/env bash
#
# check-safety-paths.sh — INFRA-416
#
# Fails when CLAUDE.md's "Protected Paths" table and /b-close Phase 2.5's path regex
# (SAFETY_PATH_RE in .claude/scripts/b-close-gate-plan.sh, read via --print-regex)
# disagree about which directories carry safety surface.
#
# It used to also reconcile /b-batch Step 3.2's hand-kept COPY of that grep, which had
# silently drifted through five Protected-Path additions. INFRA-727 deleted the copy:
# /b-batch now calls the same script with --candidates-only, so there is one regex.
#
# WHY THIS EXISTS, AND WHY IT IS NOT A CI JOB
# -------------------------------------------
# Both lists live in `.claude/`, which is tracked ONLY on the `_bare` branch and
# is explicitly gitignored on `development` (.gitignore: "Claude Configuration").
# A jest test or a CI step runs against a `development` checkout, where neither
# file exists — so the CI homes INFRA-416 originally proposed cannot read their
# own inputs. Reading them from `origin/_bare` is worse than it sounds: that ref
# routinely trails local `_bare` by dozens of commits, so CI would diff against
# stale tooling and emit confidently wrong verdicts.
#
# It is also the consistent place. Phase 2.5's gate is itself local-only —
# Maestro has no CI macOS runners. Enforcing its path list in CI would mean CI
# going green on a list for flows CI can never execute.
#
# WHAT DRIFT LOOKS LIKE
# ---------------------
# Twice now a directory carrying a 988 affordance has been invisible to the
# gate. FEAT-55 slice 1 shipped `features/guidance/` GREEN because a brand-new
# feature dir matches no existing pattern. DEBUG-390 then fixed the pre-consent
# 988 footer in `features/consent/` and Phase 2.5 fired only because the same
# branch happened to also touch two `.maestro` flows — the fix file itself
# matched nothing. The reconciliation is not the fix; this check is.
#
# Usage:  bash .claude/scripts/check-safety-paths.sh
# Exit:   0 = reconciled · 1 = drift · 2 = the check could not run

# No `set -u`: macOS ships bash 3.2, where expanding an empty array under -u is
# itself an error. Every variable here is explicitly initialised and checked.
set -o pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CLAUDE_MD="$ROOT/.claude/CLAUDE.md"
GATE_PLAN="$ROOT/.claude/scripts/b-close-gate-plan.sh"   # INFRA-727: owns SAFETY_PATH_RE
RULINGS="$ROOT/.claude/docs/safety-path-rulings.md"   # INFRA-726: per-row ruling prose

# ---------------------------------------------------------------------------
# Declared exemptions: a Protected Path deliberately NOT in the Phase 2.5 gate.
# Every entry needs a reason. An exemption is a decision, not a silence — the
# point of AC1 is that each divergence is resolved one way or the other, in
# writing. Adding a key here is how you say "gated: no, on purpose".
# ---------------------------------------------------------------------------
EXEMPT_PATHS=(
  "app/src/features/practices/"
  "app/assets/passages/"
)
exempt_reason() {
  case "$1" in
    "app/assets/passages/")
      echo "Content, not 988 reachability (FEAT-581). crisis owns WHICH passages are admitted (exit, method and abuse-tolerance spans) and philosopher owns their framing, but no Maestro flow can falsify passage text, and the library screens host no affordance of their own (the root FAB renders \`standard\` there, pinned in RootCrisisButton.test.tsx). The control is the jest pin \`__tests__/safety/classicalCorpusCrisisAdmission.test.ts\`, in \`test:safety\` (precommit + CI). Same shape as the practices/ exemption."
      ;;
    "app/src/features/practices/")
      echo "Protected for \`philosopher\` (classical accuracy), not for 988 reachability. The Validation Matrix gives \"Therapeutic content (Stoic)\" no safety-e2e cell, and no Maestro flow pins practice content. Gating it would charge a sim build for a philosophical-accuracy review — the over-trigger that trains the --skip-e2e reflex Phase 2.5 warns about. SCOPED: \`practices/dailyloop/\` is NOT covered by this exemption — DEBUG-465 carved it back in as its own Protected Path because DailyLoopStepScreen hosts SUPPORT_LINE. This exemption now means the REST of practices/. Re-scope it again if another practice screen takes on a crisis affordance. Re-scoped again DEBUG-586: \`shared/components/HapticsOptInPrompt.tsx\` and \`shared/components/ResumeSessionModal.tsx\` are NOT covered either — both import CRISIS_BUTTON_RESERVED_BAND and are gated as FILES. Re-scoped again DEBUG-587: \`shared/haptics/\` (directory) and \`shared/components/BreathingCircle.tsx\` (file) are NOT covered either — both route practice output that can reach a crisis screen, and neither imports from features/crisis/ so no detector sees them. Re-scoped again DEBUG-620: \`screens/PracticeLibraryScreen.tsx\` (file) is NOT covered either — it sizes a trailing spacer from CRISIS_BUTTON_EXCLUSION_RECT. This exemption now means the rest of practices/ outside dailyloop/, shared/haptics/, useIsFocusedSafe.ts, and those four files."
      ;;
    *) echo "NO REASON RECORDED" ;;
  esac
}

# ---------------------------------------------------------------------------
# Declared GATE-ONLY triggers: entries in Phase 2.5's grep that are deliberately
# NOT Protected Paths. These are build/config inputs and test assets, not source
# directories owned by a specialist agent, so a table row would be meaningless.
# Anything NOT listed here must have a row — see the reverse loop below.
# ---------------------------------------------------------------------------
GATE_ONLY=(
  "app/.maestro/"
  "app/app.json"
  "app/ios/"
)
gate_only_reason() {
  case "$1" in
    "app/.maestro/") echo "The flows themselves. Editing one trips the gate to run it (INFRA-517); it is not a source path with an owning agent." ;;
    "app/app.json")  echo "CNG input. Its crisis-relevant content (LSApplicationQueriesSchemes) is pinned by a jest static-config test in precommit AND the Safety + privacy gates CI job (INFRA-184/368)." ;;
    "app/ios/")      echo "Generated native project (Info.plist). iOS is CNG since INFRA-280, so this is an output of app.json, never hand-edited." ;;
    *) echo "NO REASON RECORDED" ;;
  esac
}

fail() { echo "❌ $*" >&2; }
abort() { echo "🛑 check-safety-paths: $*" >&2; exit 2; }

[ -r "$CLAUDE_MD" ] || abort "cannot read $CLAUDE_MD"
[ -r "$GATE_PLAN" ] || abort "cannot read $GATE_PLAN"

# --- The live gate regex, from the script that runs it -----------------------
# Behavioural, not textual: the script prints the regex it gates with, and we probe
# paths through it, so this check cannot drift from the gate by mis-parsing it.
GATE_RE=$(bash "$GATE_PLAN" --print-regex) || abort "$GATE_PLAN --print-regex failed"
[ -n "$GATE_RE" ] || abort "$GATE_PLAN --print-regex printed nothing.
   Failing closed rather than reporting 'no drift'."
[ "$(printf '%s\n' "$GATE_RE" | wc -l | tr -d ' ')" = 1 ] || abort "--print-regex printed more than one line;
   SAFETY_PATH_RE must stay one literal string."

# --- Extract Protected Paths from CLAUDE.md's table -------------------------
# No `mapfile` — macOS bash 3.2 does not have it.
PROTECTED=()
while IFS= read -r _p; do
  [ -n "$_p" ] && PROTECTED+=("$_p")
done < <(
  awk '/^## Protected Paths/{f=1;next} /^## /{if(f)exit} f' "$CLAUDE_MD" \
    | grep -E '^\| `app/' \
    | sed -E 's/^\| `([^`]+)`.*/\1/'
)
[ "${#PROTECTED[@]}" -ge 3 ] || abort "parsed only ${#PROTECTED[@]} Protected Paths from CLAUDE.md (expected >=3).
   The table format probably changed. Failing closed — a matcher that silently
   matches nothing would report a clean reconciliation on a broken parse."

# --- Self-test the probe ----------------------------------------------------
# Same reasoning as the DEBUG-390 lesson and check:breathing-worklets: a guard
# that can no longer fire must not read as a pass. Prove the regex still
# matches a path we know it must, and rejects one we know it must not.
gated() { printf '%s\n' "${1}__drift_probe__.ts" | grep -qE "$GATE_RE"; }
gated "app/src/features/crisis/"   || abort "self-test failed: the extracted regex does not match features/crisis/, which it must. Extraction is broken."
gated "app/src/features/tarot/"    && abort "self-test failed: the extracted regex matches an invented path. Extraction is broken."

# ---------------------------------------------------------------------------
DRIFT=0
echo "🔎 Reconciling Protected Paths (CLAUDE.md) against the Phase 2.5 gate (b-close-gate-plan.sh)"
echo

for p in "${PROTECTED[@]}"; do
  is_exempt=0
  for e in "${EXEMPT_PATHS[@]}"; do [ "$e" = "$p" ] && is_exempt=1; done

  if gated "$p"; then
    if [ "$is_exempt" -eq 1 ]; then
      fail "STALE EXEMPTION: $p is listed EXEMPT but the gate now matches it."
      echo "      Remove it from EXEMPT_PATHS, or narrow the grep." >&2
      DRIFT=1
    else
      echo "   ✅ gated      $p"
    fi
  else
    if [ "$is_exempt" -eq 1 ]; then
      echo "   ⊘  exempt     $p"
      echo "                 └─ $(exempt_reason "$p")"
    else
      fail "UNGATED PROTECTED PATH: $p"
      echo "      It is a Protected Path in CLAUDE.md but Phase 2.5's grep does not" >&2
      echo "      match it, so a change there merges with no Maestro verification." >&2
      echo "      Fix by EITHER adding it to SAFETY_PATH_RE AND giving it a Step 2.5.3" >&2
      echo "      clause, both in $GATE_PLAN, with a case in" >&2
      echo "      test-b-close-gate-plan.sh, OR adding it to EXEMPT_PATHS here with a" >&2
      echo "      recorded reason." >&2
      echo "      Record the ruling's prose in $RULINGS (INFRA-726)." >&2
      DRIFT=1
    fi
  fi
done

# --- REVERSE: gate entries with no Protected Path row (DEBUG-575) -----------
# The loop above only walks CLAUDE.md, so it catches "listed but ungated" and is
# blind to the opposite: a path GATED in the grep with no table row. That state
# reconciles clean while arming a sim build for a path that maps to NO specialist
# agent — so the build gets charged and nobody is told who must review it. Two
# paths were in exactly that state when this was written (`src/core/navigation/`
# and `src/core/config/e2eSeed.ts`), and one of them owns the accessibility
# invariant for every root-slot overlay.
#
# Expansion is textual, so it is self-tested below like every other matcher here.
expand_gate() {
  printf '%s\n' "$1" \
    | sed -E 's/^\^?app\/\(//; s/\)$//' \
    | awk '{
        n = split("", toks); depth = 0; cur = ""; t = 0
        for (i = 1; i <= length($0); i++) {
          c = substr($0, i, 1)
          if (c == "(") depth++
          if (c == ")") depth--
          if (c == "|" && depth == 0) { toks[++t] = cur; cur = "" } else { cur = cur c }
        }
        toks[++t] = cur
        for (j = 1; j <= t; j++) {
          tok = toks[j]
          o = index(tok, "(")
          if (o > 0) {
            pre = substr(tok, 1, o - 1)
            rest = substr(tok, o + 1)
            cl = index(rest, ")")
            inner = substr(rest, 1, cl - 1)
            post = substr(rest, cl + 1)
            m = split(inner, alts, "|")
            for (k = 1; k <= m; k++) print pre alts[k] post
          } else print tok
        }
      }' \
    | sed -E 's/\\\././g' \
    | sed -E 's/^/app\//'
}

GATE_ENTRIES=()
while IFS= read -r _g; do
  [ -n "$_g" ] && GATE_ENTRIES+=("$_g")
done < <(expand_gate "$GATE_RE")

[ "${#GATE_ENTRIES[@]}" -ge 5 ] || abort "expanded only ${#GATE_ENTRIES[@]} entries from the gate regex (expected >=5).
   The alternation structure probably changed. Failing closed — an expander that
   silently yields nothing would report a clean reverse reconciliation."

# Self-test the expander, same discipline as the probes above: prove it produces a
# known member and does not invent one.
_expand_selftest=$(expand_gate "$GATE_RE")
# NOTE the absent trailing slash: the grep nests crisis inside
# `src/features/(assessment|consent|crisis|...)`, so expansion yields the bare
# member. The coverage test below is prefix-based in both directions for exactly
# this reason — do not "fix" this by appending a slash.
printf '%s\n' "$_expand_selftest" | grep -qx "app/src/features/crisis" \
  || abort "self-test failed: the gate expander did not yield app/src/features/crisis. Expansion is broken."
printf '%s\n' "$_expand_selftest" | grep -qx "app/src/features/tarot/" \
  && abort "self-test failed: the gate expander invented a path. Expansion is broken."

for g in "${GATE_ENTRIES[@]}"; do
  # Regex-shaped entries (wildcards) are matched by prefix, not compared literally.
  g_base="${g%%[*}"; g_base="${g_base%%.\**}"

  is_gate_only=0
  for o in "${GATE_ONLY[@]}"; do
    case "$g_base" in "$o"*) is_gate_only=1 ;; esac
  done
  [ "$is_gate_only" -eq 1 ] && continue

  covered=0
  for p in "${PROTECTED[@]}"; do
    # Either direction counts: a dir row covering a gated file, or a file row
    # under a gated dir.
    case "$g_base" in "$p"*) covered=1 ;; esac
    case "$p" in "$g_base"*) covered=1 ;; esac
  done

  if [ "$covered" -eq 0 ]; then
    fail "GATED BUT UNLISTED: $g_base"
    echo "      Phase 2.5's grep matches it, so a change there arms a sim build —" >&2
    echo "      but it has no Protected Paths row, so it maps to NO specialist" >&2
    echo "      agent and no reviewer is named. Fix by EITHER adding a row to" >&2
    echo "      CLAUDE.md's Protected Paths table, OR adding it to GATE_ONLY here" >&2
    echo "      with a recorded reason." >&2
    echo "      Record the ruling's prose in $RULINGS (INFRA-726)." >&2
    DRIFT=1
  fi
done

# --- Gate-only entries the grep no longer contains --------------------------
for o in "${GATE_ONLY[@]}"; do
  found=0
  for g in "${GATE_ENTRIES[@]}"; do
    case "$g" in "$o"*) found=1 ;; esac
  done
  if [ "$found" -eq 0 ]; then
    fail "ORPHAN GATE-ONLY: $o is declared gate-only but the grep no longer matches it."
    echo "      The grep entry was renamed or removed; drop it from GATE_ONLY." >&2
    DRIFT=1
  fi
done

# --- Exemptions naming a path that is no longer protected -------------------
for e in "${EXEMPT_PATHS[@]}"; do
  found=0
  for p in "${PROTECTED[@]}"; do [ "$e" = "$p" ] && found=1; done
  if [ "$found" -eq 0 ]; then
    fail "ORPHAN EXEMPTION: $e is in EXEMPT_PATHS but is not a Protected Path."
    echo "      The table entry was renamed or removed; drop the exemption." >&2
    DRIFT=1
  fi
done

# --- Exemptions with no recorded reason -------------------------------------
for e in "${EXEMPT_PATHS[@]}"; do
  if [ "$(exempt_reason "$e")" = "NO REASON RECORDED" ]; then
    fail "UNREASONED EXEMPTION: $e has no entry in exempt_reason()."
    DRIFT=1
  fi
done

echo
if [ "$DRIFT" -eq 0 ]; then
  echo "✅ Reconciled: ${#PROTECTED[@]} Protected Paths and ${#EXEMPT_PATHS[@]} declared exemption(s) against b-close-gate-plan.sh's SAFETY_PATH_RE."
  exit 0
fi
echo "❌ Safety-path drift detected (INFRA-416). See above." >&2
exit 1
