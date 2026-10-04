#!/usr/bin/env bash
#
# test-b-close-gate-plan.sh — INFRA-727 AC3
#
# Fixture suite for b-close-gate-plan.sh: one case per Step 2.5.3 mapping rule, plus the
# fail-safe fallback, service-layer-only, full-suite overrides, the security carve-out
# (the `$0` defect's subject), negative controls, the INFRA-531 alarm and self-test, and
# the wrapper's refusals. /b-close Phase 0 runs it beside check-safety-paths.sh; `.claude/`
# has no CI, so this is the only place it runs.
#
# Each case copies a tiny template repo (base commit tagged `base`), applies a change,
# commits, runs the script with --base base, and asserts the EXACT outcome — exit code,
# GATE_REQUIRED, FULL_SUITE, the full FLOWS and DYNAMIC_TYPE_FLOWS sets (equality, never
# subset), and any named output line. Every run first plants a stale plan file: a
# successful run must replace it, a failed one must leave none. Every plan is sourced in
# bash AND zsh and must read the same in both.
#
# A change to SAFETY_PATH_RE or to a Step 2.5.3 clause needs a case here; a new case
# needs EXPECTED_CASES bumped. The count is pinned so a case that silently stops running
# — or a suite that runs none — fails.
#
# RUNTIME. ~20 s cold: every case is one full script run (~0.5 s — the moved 2.5.1/2.5.3
# code forks ~100 short greps, and it stays verbatim so crisis can word-diff it against
# the skill blocks it replaced). A PASS is therefore cached under $TMPDIR, keyed on the
# sha256 of this file, the script, the bash/zsh/git versions, the OS build (BSD grep/sed/awk
# ship with it) and global git config — the only inputs, since
# the fixtures are built from this file. Any edit to either file re-runs it in full.
#
# Usage: bash .claude/scripts/test-b-close-gate-plan.sh [--script <path>] [--no-cache] [-v]
# Exit:  0 all pass · 1 a case failed · 2 the suite could not run

if [ -z "${BASH_VERSION:-}" ]; then echo "run with bash" >&2; exit 2; fi

EXPECTED_CASES=109

SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/b-close-gate-plan.sh"
VERBOSE=""; NO_CACHE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --script) SCRIPT="$2"; shift 2 ;;
    --no-cache) NO_CACHE=1; shift ;;
    -v) VERBOSE=1; shift ;;
    *) echo "unknown argument $1" >&2; exit 2 ;;
  esac
done
[ -r "$SCRIPT" ] || { echo "🛑 cannot read $SCRIPT" >&2; exit 2; }
command -v zsh >/dev/null || { echo "🛑 zsh not found — the plan's zsh round-trip cannot be checked" >&2; exit 2; }

SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
CACHE_KEY="$( { shasum -a 256 "$SELF" "$SCRIPT" | cut -d' ' -f1; bash --version | head -1;
  zsh --version; git --version; uname -rv; git config --global --list 2>/dev/null; } | shasum -a 256 | cut -c1-24)"
CACHE_DIR="${TMPDIR:-/tmp}/b-close-gate-plan-test-pass"
if [ -z "$NO_CACHE" ] && [ -f "$CACHE_DIR/$CACHE_KEY" ]; then
  echo "✅ b-close-gate-plan fixtures: $(cat "$CACHE_DIR/$CACHE_KEY") — cached pass for this exact script + fixtures ($CACHE_KEY); --no-cache to re-run"
  exit 0
fi

ROOT="$(mktemp -d "${TMPDIR:-/tmp}/b-close-gate-plan-test.XXXXXX")" || exit 2
trap 'rm -rf "$ROOT"' EXIT
T="$ROOT/template"
G() { git -c user.name=t -c user.email=t@t -c commit.gpgsign=false -c init.defaultBranch=main "$@"; }

# ---------------------------------------------------------------------------
# Template repo
# ---------------------------------------------------------------------------
flow() {  # flow <name> <tag> [extra lines...]
  local n="$1" tag="$2"; shift 2
  { printf 'appId: test\ntags:\n  - %s\n---\n- launchApp\n' "$tag"; for l in "$@"; do printf '%s\n' "$l"; done; } \
    > "$T/app/.maestro/$n.yaml"
}
mkdir -p "$T/app/.maestro" "$T/app/src/features/crisis/components" "$T/app/src/features/learn"
( cd "$T" && G init -q ) || exit 2
flow crisis-button-reachability safety '- runFlow: _seeded-home.yaml # seeds home'
flow journal-crisis-scan safety '- runFlow: _sim-helper.yaml' '- assertVisible: "_residue-helper.yaml"'
flow crisis-988-dial safety-device-only '- runFlow: _device-helper.yaml'
flow reconsent-stale-ineligible-fab-clearance safety-bottom-inset
flow daily-loop-ax5-entry safety-dynamic-type
flow daily-loop-ax5-virtuous safety-dynamic-type
flow journal-record-liveness safety-host-probe
flow profile-voice-reflection-xxxl safety-dynamic-type
flow breathing-fps-budget perf-device-only
flow crisis-keyboard-accessory safety-device-only
flow export-share-sheet-occlusion safety-occlusion-measurement
flow tab-label-dynamic-type-capture safety-dynamic-type
printf -- '- tapOn: home\n' > "$T/app/.maestro/_seeded-home.yaml"
printf -- '- runFlow: _inner-helper.yaml\n' > "$T/app/.maestro/_sim-helper.yaml"
printf -- '- tapOn: inner\n' > "$T/app/.maestro/_inner-helper.yaml"
printf -- '- tapOn: device\n' > "$T/app/.maestro/_device-helper.yaml"
printf -- '- tapOn: orphan\n' > "$T/app/.maestro/_orphan-helper.yaml"
printf -- '- tapOn: residue\n' > "$T/app/.maestro/_residue-helper.yaml"
printf '{"expo":{}}\n' > "$T/app/app.json"
printf "import React from 'react';\nexport const Banner = () => {\n  const label = 'help';\n  return null;\n};\n" \
  > "$T/app/src/features/crisis/components/Banner.tsx"
printf 'export const p = 1;\n' > "$T/app/src/features/learn/Plain.tsx"
printf "import { CRISIS_BUTTON_SIZE } from '@/features/crisis/constants/crisisButtonGeometry';\nexport const legacy = CRISIS_BUTTON_SIZE;\n" \
  > "$T/app/src/features/learn/Legacy.ts"
( cd "$T" && G add -A && G commit -qm base && G tag base ) || exit 2

# ---------------------------------------------------------------------------
# Case helpers (run inside the case's copy)
# ---------------------------------------------------------------------------
w()  { mkdir -p "$(dirname "$1")"; printf '%s\n' "${2:-export const x = 1;}" > "$1"; }  # write a file
ap() { printf '%s\n' "$2" >> "$1"; }                                                    # append a line
dl() { grep -vF -- "$2" "$1" > "$1.tmp"; mv "$1.tmp" "$1"; }                               # delete matching lines
# expect <rc> <gate> <full> "<flows>" "<dynamic flows>" [stdout or stderr line fragment...]
expect() { E_RC="$1"; E_GATE="$2"; E_FULL="$3"; E_FLOWS="$4"; E_DYN="$5"; shift 5; E_SUB=("$@"); }

CBR=crisis-button-reachability
CONSENT3="deeplink-consent-gate reconsent-stale reconsent-stale-ineligible"
F=app/src/features
C=app/src/core
M=app/.maestro

# --- one case per Step 2.5.3 clause ------------------------------------------
case_crisis_ui()            { w $F/crisis/components/New.tsx; expect 0 1 "" "$CBR" ""; }
case_crisis_resources()     { w $F/crisis/screens/CrisisResourcesScreen.tsx; expect 0 1 "" "$CBR" "daily-loop-ax5-entry"; }
case_crisis_service_carved(){ w $F/crisis/services/CrisisSecurityProtocol.ts; expect 0 1 "" "" "" "SERVICE-LAYER ONLY"; }
case_crisis_tap_trace()     { w $F/crisis/services/crisisTapTrace.ts; expect 0 1 "" "$CBR" ""; }
case_crisis_host_content()  { ap $F/learn/Plain.tsx "import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';"; expect 0 1 "" "$CBR" ""; }
case_assessment()           { w $F/assessment/types/scoring.ts; expect 0 1 "" "gad7-severe phq9-severe-completion q9-single-alert" ""; }
case_consent()              { w $F/consent/CombinedLegalGateScreen.tsx; expect 0 1 "" "$CONSENT3" ""; }
case_app_tsx()              { w app/App.tsx; expect 0 1 "" "$CBR $CONSENT3" "" "Crisis-subtree ancestor changed"; }
case_posthog_provider()     { w $C/analytics/PostHogProvider.tsx; expect 0 1 "" "$CBR $CONSENT3" "" "Crisis-subtree ancestor changed"; }
case_journal()              { w $F/journal/screens/JournalScreen.tsx; expect 0 1 "" "journal-crisis-scan" ""; }
case_speech()               { w $C/services/speech/onDeviceSpeechGuard.ts; expect 0 1 "" "journal-crisis-scan" ""; }
case_patches()              { w app/patches/expo-modules-jsi+56.0.7.patch; expect 0 1 "" "$CBR" ""; }
case_consent_store()        { w $C/stores/consentStore.ts; expect 0 1 "" "$CONSENT3" ""; }
case_deeplink_validation()  { w $C/services/security/DeepLinkValidationService.ts; expect 0 1 "" "daily-loop-deeplink deeplink-consent-gate" ""; }
case_supabase_service()     { w $C/services/supabase/SupabaseService.ts; expect 0 1 "" "gad7-severe journal-crisis-scan phq9-severe-completion q9-single-alert" "" "SupabaseService changed"; }
case_data_retention()       { w $C/services/data-retention/DataRetentionService.ts; expect 0 1 "" "gad7-severe phq9-severe-completion q9-single-alert" "" "data-retention changed"; }
case_threshold_modal()      { w $C/components/ThresholdEducationModal.tsx; expect 0 1 "" "$CBR" ""; }
case_clean_home()           { w $F/home/screens/CleanHomeScreen.tsx; expect 0 1 "" "$CBR" "daily-loop-ax5-entry"; }
case_delete_account()       { w $F/profile/screens/DeleteAccountScreen.tsx; expect 0 1 "" "$CBR" "" "DeleteAccountScreen changed"; }
case_export_data()          { w $F/profile/screens/ExportDataScreen.tsx; expect 0 1 "" "$CBR" "" "ExportDataScreen changed"; }
case_profile_screen()       { w $F/profile/screens/ProfileScreen.tsx; expect 0 1 "" "$CBR" "" "ProfileScreen changed"; }
case_privacy_data()         { w $F/profile/screens/PrivacyDataScreen.tsx; expect 0 1 "" "$CBR" "" "PrivacyDataScreen changed"; }
case_external_reporter()    { w $C/services/logging/ExternalErrorReporter.ts; expect 0 1 "" "bug-report-crisis-reachability bug-report-suppressed-route" "" "The bug-report surface changed"; }
case_bug_report_overlay()   { w $C/components/BugReportOverlay.tsx; expect 0 1 "" "bug-report-crisis-reachability bug-report-suppressed-route" ""; }
case_bug_report_store()     { w $C/stores/bugReportStore.ts; expect 0 1 "" "bug-report-crisis-reachability bug-report-suppressed-route" ""; }
case_core_hooks()           { w $C/hooks/useKeyboardFrameHeight.ts; expect 0 1 "" "journal-crisis-scan" "" "A core/hooks/ file changed"; }
case_insights_components()  { w $F/insights/components/WeeklyReflectionComposer.tsx; expect 0 1 "" "$CBR" "" "insights/components changed"; }
case_session_note()         { w $F/insights/components/SessionNoteComposer.tsx; expect 0 1 "" "$CBR" "" "SessionNoteComposer changed"; }
case_insights_screen()      { w $F/insights/screens/InsightsScreen.tsx; expect 0 1 "" "$CBR" "" "InsightsScreen changed"; }
case_guidance()             { w $F/guidance/services/guidanceGate.ts; expect 0 1 "" "guidance-gentle-tier-cap guidance-suppressed-handoff" ""; }
case_dailyloop()            { w $F/practices/dailyloop/screens/DailyLoopStepScreen.tsx; expect 0 1 "" "daily-loop-deeplink daily-loop-quick-depth" "daily-loop-ax5-entry daily-loop-ax5-virtuous"; }
case_resume_modal()         { w $F/practices/shared/components/ResumeSessionModal.tsx; expect 0 1 "" "daily-loop-quick-depth" ""; }
case_haptics()              { w $F/practices/shared/haptics/useHapticCues.ts; expect 0 1 "" "$CBR" "" "A practice cue/breath surface changed"; }
case_breathing_circle()     { w $F/practices/shared/components/BreathingCircle.tsx; expect 0 1 "" "$CBR" "" "A practice cue/breath surface changed"; }
case_is_focused_safe()      { w $F/practices/shared/useIsFocusedSafe.ts; expect 0 1 "" "$CBR" ""; }
case_haptics_opt_in()       { w $F/practices/shared/components/HapticsOptInPrompt.tsx; expect 0 1 "" "$CBR" "" "HapticsOptInPrompt is FLAG-DARK"; }
case_practice_timer()       { w $F/learn/practices/PracticeTimerScreen.tsx; expect 0 1 "" "$CBR" "" "a practice FAB-clearance surface changed"; }
case_practice_toggle()      { w $F/learn/practices/shared/PracticeToggleButton.tsx; expect 0 1 "" "$CBR" ""; }
case_practice_library()     { w $F/practices/screens/PracticeLibraryScreen.tsx; expect 0 1 "" "$CBR" ""; }
case_practice_completion()  { w $F/learn/practices/shared/usePracticeCompletion.tsx; expect 0 1 "" "$CBR" "" "usePracticeCompletion changed"; }
case_fab_clearance_content(){ w $F/consent/ReConsentIneligibleScreen.tsx "export const pad = CRISIS_FAB_CLEARANCE;"; expect 0 1 "" "$CONSENT3" "" "A CRISIS_FAB_CLEARANCE surface changed"; }
# --- the security carve-out (the subject of the `$0` defect) ------------------
case_encryption_service()   { w $C/services/security/EncryptionService.ts; expect 0 1 "" "$CBR" ""; }
case_secure_storage()       { w $C/services/security/SecureStorageService.ts; expect 0 1 "" "$CBR" ""; }
case_security_monitoring()  { w $C/services/security/SecurityMonitoringService.ts; expect 0 1 "" "" "" "SERVICE-LAYER ONLY"; }
case_security_mixed()       { w $C/services/security/SecurityMonitoringService.ts; w $C/services/security/EncryptionService.ts; expect 0 1 "" "$CBR" ""; }
# --- .maestro flows and helpers --------------------------------------------------
case_flow_safety_edit()     { ap $M/journal-crisis-scan.yaml "- back"; expect 0 1 "" "journal-crisis-scan" ""; }
case_flow_new_safety()      { printf 'appId: t\ntags:\n  - safety\n---\n- launchApp\n' > $M/brand-new-safety.yaml; expect 0 1 "" "brand-new-safety" ""; }
case_flow_deletion_only()   { dl $M/journal-crisis-scan.yaml "- launchApp"; expect 0 1 "" "journal-crisis-scan" ""; }
case_helper_sim_caller()    { ap $M/_sim-helper.yaml "- back"; expect 0 1 "" "journal-crisis-scan" ""; }
case_helper_transitive()    { ap $M/_inner-helper.yaml "- back"; expect 0 1 "" "journal-crisis-scan" ""; }
case_helper_device_only()   { ap $M/_device-helper.yaml "- back"; expect 0 1 "" "$CBR" "" "included by callers this gate CANNOT run" "No Step 2.5.3 clause matched"; }
case_helper_seeded_home()   { ap $M/_seeded-home.yaml "- back"; expect 0 1 "" "$CBR" ""; }
case_helper_no_callers()    { ap $M/_orphan-helper.yaml "- back"; expect 0 1 1 "" "" "has no runFlow: caller in either tree"; }
case_helper_residue()       { ap $M/_residue-helper.yaml "- back"; expect 0 1 1 "" "" "is named on non-comment lines the matcher did not classify"; }
case_config_yaml()          { printf 'flows: []\n' > $M/config.yaml; expect 0 1 1 "" "" "config.yaml exists"; }
case_flow_988_dial()        { ap $M/crisis-988-dial.yaml "- back"; expect 0 1 "" "$CBR" "" "crisis-988-dial.yaml changed" "No Step 2.5.3 clause matched"; }
case_flow_fab_clearance()   { ap $M/reconsent-stale-ineligible-fab-clearance.yaml "- back"; expect 0 1 "" "$CBR" "" "safety-bottom-inset"; }
case_flow_ax5_entry()       { ap $M/daily-loop-ax5-entry.yaml "- back"; expect 0 1 "" "" "daily-loop-ax5-entry" "Step 2.5.5 runs it at AX5"; }
case_flow_ax5_virtuous()    { ap $M/daily-loop-ax5-virtuous.yaml "- back"; expect 0 1 "" "" "daily-loop-ax5-virtuous"; }
case_flow_record_liveness() { ap $M/journal-record-liveness.yaml "- back"; expect 0 1 "" "$CBR" "" "safety-host-probe"; }
case_flow_breathing_fps()   { ap $M/breathing-fps-budget.yaml "- back"; expect 0 1 "" "$CBR" "" "perf-device-only"; }
case_flow_xxxl()            { ap $M/profile-voice-reflection-xxxl.yaml "- back"; expect 0 1 "" "$CBR" "" "npm run e2e:safety:xxxl"; }
case_flow_tab_label()       { ap $M/tab-label-dynamic-type-capture.yaml "- back"; expect 0 1 "" "$CBR" "" "CAPTURE HARNESS"; }
case_flow_export_occlusion(){ ap $M/export-share-sheet-occlusion.yaml "- back"; expect 0 1 "" "$CBR" "" "PINS A DEBT STATE"; }
case_flow_kbd_accessory()   { ap $M/crisis-keyboard-accessory.yaml "- back"; expect 0 1 "" "crisis-keyboard-reachability" ""; }
case_flow_unmapped_tag()    { printf 'appId: t\ntags:\n  - experimental\n---\n' > $M/odd-one.yaml; expect 0 1 1 "" "" "unmapped flow odd-one.yaml" "arm-set drift: odd-one.yaml"; }
# --- full-suite overrides --------------------------------------------------------
case_e2e_seed()             { w $C/config/e2eSeed.ts; expect 0 1 1 "" ""; }
case_navigation()           { w $C/navigation/CleanTabNavigator.tsx; expect 0 1 1 "" ""; }
case_navigation_override()  { w $C/navigation/CleanTabNavigator.tsx; w $F/journal/x.ts; w $F/crisis/components/New.tsx; expect 0 1 1 "" ""; }
# --- fail-safe fallback: gated by 2.5.1, matched by no 2.5.3 clause -------------
case_plugins_fallback()     { w app/plugins/withPrivacyShield.js; expect 0 1 "" "$CBR" "" "No Step 2.5.3 clause matched"; }
case_app_json_fallback()    { w app/app.json '{"expo":{"name":"x"}}'; expect 0 1 "" "$CBR" "" "No Step 2.5.3 clause matched"; }
case_info_plist_fallback()  { w app/ios/Being/Info.plist "<plist/>"; expect 0 1 "" "$CBR" "" "No Step 2.5.3 clause matched"; }
case_app_json_deletion()    { w app/app.json ''; expect 0 1 "" "$CBR" ""; }
# --- combinations ------------------------------------------------------------------
case_multi_dedupe()         { w $F/crisis/components/New.tsx; w $F/journal/x.ts; w $C/hooks/useX.ts; w $C/components/ThresholdEducationModal.tsx; expect 0 1 "" "$CBR journal-crisis-scan" ""; }
# --- negative controls: must NOT gate ---------------------------------------------
case_no_change()            { :; expect 0 "" "" "" "" "No safety-surface changes detected"; }
case_practices_exempt()     { w $F/practices/morning/MorningFlowNavigator.tsx; expect 0 "" "" "" ""; }
case_test_only()            { w $F/crisis/__tests__/Banner.test.tsx; w $F/assessment/scoring.spec.ts; expect 0 "" "" "" ""; }
case_comment_only()         { ap $F/crisis/components/Banner.tsx "// a note"; ap $F/crisis/components/Banner.tsx "/** doc */"; expect 0 "" "" "" "" "comment/whitespace-only"; }
case_deletion_only()        { dl $F/crisis/components/Banner.tsx "const label"; expect 0 "" "" "" "" "deletion-only"; }
case_host_comment_only()    { ap $F/learn/Plain.tsx "// mirrors CollapsibleCrisisButton's 44pt target"; expect 0 "" "" "" ""; }
case_host_in_test_only()    { w $F/learn/__tests__/Host.test.tsx "render(<CollapsibleCrisisButton />);"; expect 0 "" "" "" ""; }
case_settings_store()       { w $C/stores/settingsStore.ts; expect 0 "" "" "" ""; }
# --- negative controls: must STAY gated ---------------------------------------------
case_jsx_comment()          { ap $F/crisis/components/Banner.tsx "      {/* note */}"; expect 0 1 "" "$CBR" ""; }
case_mixed_comment_code()   { ap $F/crisis/components/Banner.tsx "const y = 1; // note"; expect 0 1 "" "$CBR" ""; }
# --- INFRA-531 -----------------------------------------------------------------------
case_i531_added_import()    { ap $F/learn/Plain.tsx "import { X } from '@/features/crisis/constants/crisisInputAccessory';"; expect 1 "" "" "" "" "INFRA-531: a file OUTSIDE the Protected Paths set"; }
case_i531_removed_import()  { dl $F/learn/Legacy.ts "crisisButtonGeometry"; expect 1 "" "" "" "" "INFRA-531: a file OUTSIDE the Protected Paths set"; }
case_i531_gated_file()      { w $F/home/screens/CleanHomeScreen.tsx "import { A } from '@/features/crisis/constants/crisisButtonGeometry';"; expect 0 1 "" "$CBR" "daily-loop-ax5-entry"; }
case_i531_comment()         { ap $F/learn/Plain.tsx "// ported from '@/features/crisis/constants/crisisButtonGeometry'"; expect 0 "" "" "" ""; }

CASES=$(declare -F | sed -n 's/^declare -f case_//p')

# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------
CANON='canon() {
  printf "GATE_REQUIRED=%s\nFULL_SUITE=%s\n" "$GATE_REQUIRED" "$FULL_SUITE"
  printf "FLOWS=%s\n" "${FLOWS[*]}"; printf "DYN=%s\n" "${DYNAMIC_TYPE_FLOWS[*]}"
  printf "SAFETY_CHANGED<<%s>>\nCRISIS_HOST_CHANGED<<%s>>\n" "$SAFETY_CHANGED" "$CRISIS_HOST_CHANGED"
}'
sorted() { printf '%s\n' $1 | grep . | sort -u | tr '\n' ' ' | sed 's/ $//'; }

run_case() {  # run_case <name> → writes $ROOT/r/<name>: PASS or FAIL lines
  local n="$1" d="$ROOT/c/$1" out="$ROOT/r/$1" why="" rc plan
  cp -Rp "$T" "$d" || { echo "FAIL $n: copy" > "$out"; return; }
  mkdir -p "$d.tmp"
  (
    cd "$d" || exit 9
    "case_$n"
    G add -A >/dev/null 2>&1 && G commit -q --allow-empty -m "case $n" >/dev/null 2>&1 || exit 9
    declare -p E_RC E_GATE E_FULL E_FLOWS E_DYN E_SUB > "$d.exp"
  ) || { echo "FAIL $n: setup" > "$out"; return; }
  . "$d.exp"
  plan="$(TMPDIR="$d.tmp" bash "$SCRIPT" --worktree "$d" --plan-path)"
  mkdir -p "$(dirname "$plan")"; echo "STALE=1" > "$plan"
  TMPDIR="$d.tmp" bash "$SCRIPT" --worktree "$d" --base base > "$d.out" 2>&1
  rc=$?
  [ "$rc" = "$E_RC" ] || why="$why rc=$rc(want $E_RC)"
  for s in "${E_SUB[@]}"; do grep -qF -- "$s" "$d.out" || why="$why missing-line[$s]"; done
  if [ "$rc" = 0 ]; then
    if [ ! -f "$plan" ] || grep -q '^STALE=1' "$plan"; then
      why="$why stale-or-missing-plan"
    else
      local head; head="$(git -C "$d" rev-parse HEAD)"
      grep -qx "PLAN_HEAD=$head" "$plan" || why="$why PLAN_HEAD"
      bash -c "$CANON; . \"$plan\"; canon" > "$d.bash" 2>&1
      zsh  -c "$CANON; . \"$plan\"; canon" > "$d.zsh"  2>&1
      cmp -s "$d.bash" "$d.zsh" || why="$why bash-vs-zsh"
      (
        . "$plan"
        r=""
        [ "$GATE_REQUIRED" = "$E_GATE" ] || r="$r GATE=$GATE_REQUIRED(want $E_GATE)"
        [ "$FULL_SUITE" = "$E_FULL" ] || r="$r FULL=$FULL_SUITE(want $E_FULL)"
        [ "${FLOWS[*]}" = "$(sorted "$E_FLOWS")" ] || r="$r FLOWS=[${FLOWS[*]}](want [$(sorted "$E_FLOWS")])"
        [ "${DYNAMIC_TYPE_FLOWS[*]}" = "$(sorted "$E_DYN")" ] || \
          r="$r DYN=[${DYNAMIC_TYPE_FLOWS[*]}](want [$(sorted "$E_DYN")])"
        printf '%s' "$r"
      ) > "$d.vals"
      why="$why$(cat "$d.vals")"
    fi
  else
    [ -e "$plan" ] && why="$why plan-left-on-rc-$rc"
  fi
  if [ -z "$why" ]; then echo "PASS $n" > "$out"; else echo "FAIL $n:$why" > "$out"; fi
}

# Wrapper refusals and modes. Each writes PASS/FAIL like a case.
special() {  # special <name> <want-rc> <cmd...>
  local n="$1" want="$2" rc; shift 2
  "$@" > "$ROOT/s.$n.out" 2>&1; rc=$?
  if [ "$rc" = "$want" ]; then echo "PASS special_$n" > "$ROOT/r/special_$n"
  else echo "FAIL special_$n: rc=$rc(want $want) $(head -3 "$ROOT/s.$n.out" | tr '\n' ' ')" > "$ROOT/r/special_$n"; fi
}
run_specials() {
  export TMPDIR="$ROOT/stmp"; mkdir -p "$TMPDIR"
  local base="$ROOT/c/_special"; cp -Rp "$T" "$base"
  ( cd "$base" && w app/src/features/practices/dailyloop/x.ts && G add -A && G commit -qm s ) >/dev/null 2>&1
  special missing_worktree 2 bash "$SCRIPT" --base base
  special relative_worktree 2 bash "$SCRIPT" --worktree app --base base
  special subdir_worktree 2 bash "$SCRIPT" --worktree "$base/app" --base base
  special unknown_arg 2 bash "$SCRIPT" --worktree "$base" --frobnicate
  special tmpdir_unset 2 env -u TMPDIR bash "$SCRIPT" --worktree "$base" --base base
  special under_zsh 2 zsh "$SCRIPT" --worktree "$base" --base base
  special bad_base 2 bash "$SCRIPT" --worktree "$base" --base no-such-ref
  special range_without_candidates 2 bash "$SCRIPT" --worktree "$base" --range base..HEAD
  special range_bad_ref 2 bash "$SCRIPT" --worktree "$base" --candidates-only --range base..nope
  special range_three_dot 2 bash "$SCRIPT" --worktree "$base" --candidates-only --range base...HEAD
  # Self-test failure → 2 (a tooling error), never a silent pass.
  sed "s|^I531_IMPORT_RE=.*|I531_IMPORT_RE='^NEVER-MATCHES'|" "$SCRIPT" > "$ROOT/mut-i531.sh"
  special i531_selftest 2 bash "$ROOT/mut-i531.sh" --worktree "$base" --base base
  # Candidates-only: the gated path is listed, under both base and range forms.
  ( out="$(bash "$SCRIPT" --worktree "$base" --candidates-only --base base)" && \
    printf '%s\n' "$out" | grep -qF '  app/src/features/practices/dailyloop/x.ts' && \
    printf '%s\n' "$out" | grep -qF 'Safety-surface candidates present' ) \
    && echo "PASS special_candidates" > "$ROOT/r/special_candidates" \
    || echo "FAIL special_candidates" > "$ROOT/r/special_candidates"
  ( out="$(bash "$SCRIPT" --worktree "$base" --candidates-only --range base..HEAD)" && \
    printf '%s\n' "$out" | grep -qF '  app/src/features/practices/dailyloop/x.ts' ) \
    && echo "PASS special_candidates_range" > "$ROOT/r/special_candidates_range" \
    || echo "FAIL special_candidates_range" > "$ROOT/r/special_candidates_range"
  ( out="$(bash "$SCRIPT" --worktree "$base" --candidates-only --range HEAD..HEAD)" && \
    printf '%s\n' "$out" | grep -qF 'No safety-surface candidates' ) \
    && echo "PASS special_candidates_empty" > "$ROOT/r/special_candidates_empty" \
    || echo "FAIL special_candidates_empty" > "$ROOT/r/special_candidates_empty"
  # --print-regex: one non-empty literal that gates crisis and not an invented dir.
  ( re="$(bash "$SCRIPT" --print-regex)" && [ "$(printf '%s\n' "$re" | wc -l | tr -d ' ')" = 1 ] && \
    printf 'app/src/features/crisis/x.ts\n' | grep -qE "$re" && \
    ! printf 'app/src/features/tarot/x.ts\n' | grep -qE "$re" ) \
    && echo "PASS special_print_regex" > "$ROOT/r/special_print_regex" \
    || echo "FAIL special_print_regex" > "$ROOT/r/special_print_regex"
  # No merge base: INAPPLICABLE (exit 0) only without app/; with app/ it is exit 2.
  local orphan="$ROOT/c/_orphan"; cp -Rp "$T" "$orphan"
  ( cd "$orphan" && G checkout -q --orphan tooling && G rm -rfq . && printf 'x\n' > README.md && \
    G add -A && G commit -qm orphan ) >/dev/null 2>&1
  ( TMPDIR="$ROOT/c/_orphan.tmp"; mkdir -p "$TMPDIR"; export TMPDIR
    bash "$SCRIPT" --worktree "$orphan" --base base > "$ROOT/s.orphan.out" 2>&1 && \
    p="$(bash "$SCRIPT" --worktree "$orphan" --plan-path)" && \
    grep -qx 'INAPPLICABLE=1' "$p" && grep -qx 'GATE_REQUIRED=' "$p" && \
    grep -qF 'INAPPLICABLE, not passing' "$ROOT/s.orphan.out" ) \
    && echo "PASS special_inapplicable" > "$ROOT/r/special_inapplicable" \
    || echo "FAIL special_inapplicable" > "$ROOT/r/special_inapplicable"
  ( cd "$orphan" && w app/x.ts && G add -A && G commit -qm app ) >/dev/null 2>&1
  special no_merge_base_with_app 2 bash "$SCRIPT" --worktree "$orphan" --base base
  # --check-plan: fresh → the path; missing, or HEAD moved since the plan → exit 2.
  local cp="$ROOT/c/_checkplan"; cp -Rp "$T" "$cp"
  ( cd "$cp" && w app/src/features/journal/x.ts && G add -A && G commit -qm j ) >/dev/null 2>&1
  special check_plan_missing 2 bash "$SCRIPT" --worktree "$cp" --check-plan
  bash "$SCRIPT" --worktree "$cp" --base base >/dev/null 2>&1
  ( p="$(bash "$SCRIPT" --worktree "$cp" --check-plan)" && . "$p" && [ "${FLOWS[*]}" = journal-crisis-scan ] ) \
    && echo "PASS special_check_plan_fresh" > "$ROOT/r/special_check_plan_fresh" \
    || echo "FAIL special_check_plan_fresh" > "$ROOT/r/special_check_plan_fresh"
  ( cd "$cp" && G commit -q --allow-empty -m later ) >/dev/null 2>&1
  special check_plan_stale_head 2 bash "$SCRIPT" --worktree "$cp" --check-plan
  bash "$SCRIPT" --worktree "$cp" --base base >/dev/null 2>&1
  cp "$(bash "$SCRIPT" --worktree "$cp" --plan-path)" "$(bash "$SCRIPT" --worktree "$base" --plan-path)"
  special check_plan_other_tree 2 bash "$SCRIPT" --worktree "$base" --check-plan
}

START=$(date +%s)
mkdir -p "$ROOT/c" "$ROOT/r"
# Fixed buckets, one background worker each (bash 3.2 has no `wait -n` for a pool).
JOBS=10; k=0
while [ "$k" -lt "$JOBS" ]; do
  ( i=0; for n in $CASES; do
      [ $((i % JOBS)) -eq "$k" ] && run_case "$n"; i=$((i + 1))
    done ) &
  k=$((k + 1))
done
run_specials &
wait

RAN=$(ls "$ROOT/r" | wc -l | tr -d ' ')
FAILS=$(cat "$ROOT"/r/* | grep -c '^FAIL' || true)
[ -n "$VERBOSE" ] && cat "$ROOT"/r/* | sort
cat "$ROOT"/r/* | grep '^FAIL' | sed 's/^/❌ /'
ELAPSED=$(( $(date +%s) - START ))
if [ "$RAN" -eq 0 ]; then echo "🛑 no cases ran" >&2; exit 2; fi
if [ "$RAN" -ne "$EXPECTED_CASES" ]; then
  echo "❌ ran $RAN case(s), EXPECTED_CASES is $EXPECTED_CASES — a case stopped running, or one was added without bumping the pin."
  exit 1
fi
if [ "$FAILS" -gt 0 ]; then
  echo "❌ b-close-gate-plan fixtures: $FAILS of $RAN failed (${ELAPSED}s)"
  exit 1
fi
echo "✅ b-close-gate-plan fixtures: $RAN/$RAN passed (${ELAPSED}s)"
mkdir -p "$CACHE_DIR" 2>/dev/null && echo "$RAN/$RAN passed on $(date '+%Y-%m-%d %H:%M')" > "$CACHE_DIR/$CACHE_KEY"
exit 0
