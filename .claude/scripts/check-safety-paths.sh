#!/usr/bin/env bash
#
# check-safety-paths.sh — INFRA-416
#
# Fails when CLAUDE.md's "Protected Paths" table and /b-close Phase 2.5's
# SAFETY_CANDIDATES grep disagree about which directories carry safety surface.
#
# ALSO reconciles /b-batch Step 3.2's COPY of that grep against b-close's. That copy
# exists because /b-batch tiers an item before /b-close ever sees it, and it had
# silently drifted through five Protected-Path additions — each one landed in the
# enforced copy and missed the other. Under-classifying there is the safe direction
# (b-close re-runs its own detection and is the authority), but the tier feeds
# /b-batch's RED quota, which bounds attended HUMAN sessions — so a drifted copy
# mis-sizes the slate rather than mis-gating the merge.
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
B_CLOSE="$ROOT/.claude/commands/b-close.md"
B_BATCH="$ROOT/.claude/commands/b-batch.md"

# ---------------------------------------------------------------------------
# Declared exemptions: a Protected Path deliberately NOT in the Phase 2.5 gate.
# Every entry needs a reason. An exemption is a decision, not a silence — the
# point of AC1 is that each divergence is resolved one way or the other, in
# writing. Adding a key here is how you say "gated: no, on purpose".
# ---------------------------------------------------------------------------
EXEMPT_PATHS=(
  "app/src/features/practices/"
)
exempt_reason() {
  case "$1" in
    "app/src/features/practices/")
      echo "Protected for \`philosopher\` (classical accuracy), not for 988 reachability. The Validation Matrix gives \"Therapeutic content (Stoic)\" no safety-e2e cell, and no Maestro flow pins practice content. Gating it would charge a sim build for a philosophical-accuracy review — the over-trigger that trains the --skip-e2e reflex Phase 2.5 warns about. SCOPED: \`practices/dailyloop/\` is NOT covered by this exemption — DEBUG-465 carved it back in as its own Protected Path because DailyLoopStepScreen hosts SUPPORT_LINE. This exemption now means the REST of practices/. Re-scope it again if another practice screen takes on a crisis affordance."
      ;;
    *) echo "NO REASON RECORDED" ;;
  esac
}

fail() { echo "❌ $*" >&2; }
abort() { echo "🛑 check-safety-paths: $*" >&2; exit 2; }

[ -r "$CLAUDE_MD" ] || abort "cannot read $CLAUDE_MD"
[ -r "$B_CLOSE" ]   || abort "cannot read $B_CLOSE"
[ -r "$B_BATCH" ]   || abort "cannot read $B_BATCH"

# --- Extract the live gate regex from b-close.md ----------------------------
# Behavioural, not textual: we pull the REAL regex and probe paths through it,
# so this check cannot drift from the grep by mis-parsing its structure.
GATE_RE=$(grep -oE "'\^app/\([^']*\)'" "$B_CLOSE" | head -1 | sed "s/^'//; s/'\$//")
[ -n "$GATE_RE" ] || abort "could not extract the SAFETY_CANDIDATES regex from b-close.md
   Looked for a single-quoted pattern beginning '^app/(  — if Phase 2.5's grep was
   reformatted, update this extractor. Failing closed rather than reporting 'no drift'."

# /b-batch Step 3.2's copy. Deliberately a DIFFERENT extractor: b-close anchors with
# `^app/(`, b-batch does not. Matching the anchor here would silently extract nothing
# and read as a clean reconciliation — the failure mode this whole file exists to stop.
BATCH_RE=$(grep -oE "'app/\([^']*\)'" "$B_BATCH" | head -1 | sed "s/^'//; s/'\$//")
[ -n "$BATCH_RE" ] || abort "could not extract the safety grep from b-batch.md Step 3.2
   Looked for a single-quoted pattern beginning 'app/(  — if it was reformatted,
   update this extractor. Failing closed rather than reporting 'no drift'."

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

# Same two probes through b-batch's copy. Both extractors must be proven live before
# either is trusted to report agreement.
batch_gated() { printf '%s\n' "${1}__drift_probe__.ts" | grep -qE "$BATCH_RE"; }
batch_gated "app/src/features/crisis/" || abort "self-test failed: the b-batch regex does not match features/crisis/, which it must. Extraction is broken."
batch_gated "app/src/features/tarot/"  && abort "self-test failed: the b-batch regex matches an invented path. Extraction is broken."

# ---------------------------------------------------------------------------
DRIFT=0
echo "🔎 Reconciling Protected Paths (CLAUDE.md) against Phase 2.5 gate (b-close.md)"
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
      echo "      Fix by EITHER adding it to the SAFETY_CANDIDATES grep in" >&2
      echo "      b-close.md AND mapping it to a flow in Step 2.5.3, OR adding it" >&2
      echo "      to EXEMPT_PATHS here with a recorded reason." >&2
      DRIFT=1
    fi
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

# --- /b-batch Step 3.2's copy of the same grep --------------------------------
# Compared LITERALLY first, because the two should be identical modulo b-close's `^`
# anchor and "do not maintain a second list" is the actual rule. A literal check also
# catches an alternation branch the probe corpus below happens not to cover, which is
# how this drifted in the first place — every new Protected Path landed in one copy.
#
# On a mismatch the corpus then says WHICH KIND: paths the two classify differently
# (real drift, someone must fix it) versus none (cosmetic — reordered or reformatted,
# still worth reconciling but nothing is mis-tiered meanwhile). Reporting those two as
# one verdict is what makes a check tedious enough to ignore.
echo
matches() { printf '%s\n' "$2" | grep -qE "$1"; }

# Every alternation branch in the greps, plus negatives. A branch added to both copies
# and not to this corpus is still caught by the literal compare above — the corpus only
# has to classify a mismatch, never to be exhaustive on its own.
PROBE_PATHS=(
  "app/src/features/assessment/scoring.ts"
  "app/src/features/consent/CombinedLegalGateScreen.tsx"
  "app/src/features/crisis/components/RootCrisisButton.tsx"
  "app/src/features/guidance/services/guidanceGate.ts"
  "app/src/features/journal/screens/VoiceReflectionScreen.tsx"
  "app/src/features/practices/dailyloop/screens/DailyLoopStepScreen.tsx"
  "app/src/features/insights/components/SessionNoteComposer.tsx"
  "app/src/features/insights/components/WeeklyReflectionComposer.tsx"
  "app/src/core/services/security/EncryptionService.ts"
  "app/src/core/navigation/CleanRootNavigator.tsx"
  "app/src/core/hooks/useOverlayBottomInset.ts"
  "app/src/core/components/ThresholdEducationModal.tsx"
  "app/src/core/config/e2eSeed.ts"
  "app/src/core/stores/consentStore.ts"
  "app/plugins/withAppGroupsEntitlement.js"
  "app/.maestro/journal-crisis-scan.yaml"
  "app/app.json"
  "app/ios/Being/Info.plist"
  "app/src/features/practices/morning/MorningFlowNavigator.tsx"
  "app/src/features/home/screens/CleanHomeScreen.tsx"
  "app/src/features/profile/screens/DeleteAccountScreen.tsx"
  "app/src/core/stores/settingsStore.ts"
  "app/src/core/components/AccessibleButton.tsx"
)

GATE_RE_UNANCHORED="${GATE_RE#^}"
if [ "$GATE_RE_UNANCHORED" = "$BATCH_RE" ]; then
  echo "   ✅ b-batch Step 3.2's grep is identical to b-close Step 2.5.1's"
else
  SEMANTIC=""
  for pp in "${PROBE_PATHS[@]}"; do
    c=0; b=0
    matches "$GATE_RE" "$pp" && c=1
    matches "$BATCH_RE" "$pp" && b=1
    [ "$c" != "$b" ] && SEMANTIC="$SEMANTIC
      $pp  (b-close: $([ $c -eq 1 ] && echo gated || echo ungated) · b-batch: $([ $b -eq 1 ] && echo gated || echo ungated))"
  done
  if [ -n "$SEMANTIC" ]; then
    fail "SAFETY-GREP DRIFT: /b-batch Step 3.2 classifies these differently from /b-close Step 2.5.1:$SEMANTIC"
    echo "      /b-close is the authority and re-runs its own detection, so the MERGE is" >&2
    echo "      still gated correctly — but /b-batch tiers items against its copy, and the" >&2
    echo "      tier feeds the RED quota that bounds attended human sessions." >&2
  else
    fail "SAFETY-GREP DRIFT (cosmetic): the two greps differ textually but classify every"
    echo "      probe path alike. Nothing is mis-tiered today; reconcile them anyway so the" >&2
    echo "      next real divergence is visible as one." >&2
  fi
  echo "      Make b-batch Step 3.2's pattern identical to b-close Step 2.5.1's, minus" >&2
  echo "      the leading ^ anchor." >&2
  DRIFT=1
fi

echo
if [ "$DRIFT" -eq 0 ]; then
  echo "✅ Reconciled: ${#PROTECTED[@]} Protected Paths, ${#EXEMPT_PATHS[@]} declared exemption(s), and the b-batch grep copy."
  exit 0
fi
echo "❌ Safety-path drift detected (INFRA-416). See above." >&2
exit 1
