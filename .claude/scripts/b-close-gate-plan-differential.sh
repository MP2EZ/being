#!/usr/bin/env bash
#
# b-close-gate-plan-differential.sh — INFRA-727 AC2
#
# Proves b-close-gate-plan.sh computes what the skill's own bash blocks computed. For
# every merge commit M on origin/development it checks out M^2 in a scratch worktree and
# runs, with base = M^1:
#   OLD  — Step 2.5.1 + Step 2.5.3 extracted from --old-rev's b-close.md and
#          b-close-gate.md, in one bash process, 2.5.3 only on an active gate;
#   NEW  — the script.
# and compares exit code, stdout, stderr, and the five plan variables. The new plan is
# sourced in BOTH bash and zsh (consumers run under the Bash tool's zsh). Any difference
# fails the run.
#
# Usage:
#   bash b-close-gate-plan-differential.sh --old-rev <rev> --out <dir>
#        [--script <path>] [--merges <file of shas>] [--jobs N] [--expect-diff]
#   bash b-close-gate-plan-differential.sh --old-rev <rev> --out <dir> --controls
#        The two mutation controls (crisis ruling): a dropped mapping clause and a
#        one-character regex change. Each MUST produce differences, or the harness is
#        blind and a zero-diff result means nothing.
#
# Exit: 0 = the expected verdict · 1 = the opposite verdict · 2 = harness error.
#
# Run it detached for the full set (~1052 merges): it holds N scratch worktrees under
# --out and removes them at the end. It never writes inside a real worktree.

if [ -z "${BASH_VERSION:-}" ]; then echo "run with bash" >&2; exit 2; fi

REPO=/Users/max/dev/being
OLD_REV=""; OUT=""; SCRIPT="$REPO/.claude/scripts/b-close-gate-plan.sh"; MERGES=""; JOBS=4
EXPECT_DIFF=""; CONTROLS=""
die() { echo "🛑 differential: $*" >&2; exit 2; }
while [ $# -gt 0 ]; do
  case "$1" in
    --old-rev) OLD_REV="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --script) SCRIPT="$2"; shift 2 ;;
    --merges) MERGES="$2"; shift 2 ;;
    --jobs) JOBS="$2"; shift 2 ;;
    --expect-diff) EXPECT_DIFF=1; shift ;;
    --controls) CONTROLS=1; shift ;;
    *) die "unknown argument $1" ;;
  esac
done
[ -n "$OLD_REV" ] && [ -n "$OUT" ] || die "--old-rev and --out are required"
case "$OUT" in /*) ;; *) die "--out must be absolute" ;; esac
git -C "$REPO" rev-parse --verify -q "$OLD_REV^{commit}" >/dev/null || die "$OLD_REV does not resolve"
[ -r "$SCRIPT" ] || die "cannot read $SCRIPT"
mkdir -p "$OUT" || die "cannot create $OUT"
SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"

# --- mutation controls -------------------------------------------------------
if [ -n "$CONTROLS" ]; then
  # The subset: merges whose own diff reaches features/journal/ outside tests — the
  # clause and the regex branch both mutations below break.
  SUB="$OUT/journal-merges.txt"
  : > "$SUB"
  for m in $(git -C "$REPO" rev-list --merges origin/development); do
    mb="$(git -C "$REPO" merge-base "$m^1" "$m^2" 2>/dev/null)" || continue
    git -C "$REPO" diff --name-only "$mb" "$m^2" | grep -vE '(__tests__/|\.test\.|\.spec\.)' \
      | grep -q '^app/src/features/journal/' && echo "$m" >> "$SUB"
  done
  n=$(wc -l < "$SUB" | tr -d ' ')
  [ "$n" -gt 0 ] || die "no merge touches features/journal/ — controls cannot run"
  echo "Controls run on $n journal-touching merge(s)."
  M1="$OUT/mutant-dropped-clause.sh"
  awk 'prev ~ /grep -q .src\/features\/journal\/. && \\$/ && /FLOWS\+=\("journal-crisis-scan"\)/ {print "  :"; prev=$0; next} {print; prev=$0}' \
    "$SCRIPT" > "$M1"
  cmp -s "$SCRIPT" "$M1" && die "mutation 1 (drop the journal clause) changed nothing — fix the control"
  M2="$OUT/mutant-regex.sh"
  sed "s/|journal|practices\/dailyloop)/|journai|practices\/dailyloop)/" "$SCRIPT" > "$M2"
  cmp -s "$SCRIPT" "$M2" && die "mutation 2 (one regex character) changed nothing — fix the control"
  rc_all=0
  for mut in "$M1" "$M2"; do
    bash "$SELF" --old-rev "$OLD_REV" --out "$OUT/$(basename "$mut" .sh)" --script "$mut" \
      --merges "$SUB" --jobs "$JOBS" --expect-diff > "$OUT/$(basename "$mut" .sh).log" 2>&1
    rc=$?
    echo "  $(basename "$mut"): $(tail -1 "$OUT/$(basename "$mut" .sh).log")  (rc=$rc)"
    [ "$rc" -eq 0 ] || rc_all=1
  done
  if [ "$rc_all" -eq 0 ]; then echo "✅ Both mutation controls went RED — the harness can fail."
  else echo "❌ A mutation control stayed GREEN — the harness is blind to it."; fi
  exit "$rc_all"
fi

# --- build OLD from the pinned skill files ----------------------------------
extract() {  # $1 = file content path, $2 = heading prefix
  awk -v h="$2" 'index($0,h)==1{f=1;next} f&&/^```bash$/{b=1;next} b&&/^```$/{exit} b{print}' "$1"
}
git -C "$REPO" show "$OLD_REV:.claude/commands/b-close.md" > "$OUT/old-b-close.md" || die "show b-close.md"
git -C "$REPO" show "$OLD_REV:.claude/docs/b-close-gate.md" > "$OUT/old-gate.md" || die "show gate file"
extract "$OUT/old-b-close.md" "### Step 2.5.1" > "$OUT/old-251.sh"
extract "$OUT/old-gate.md" "### Step 2.5.3: Map" > "$OUT/old-253.sh"
[ -s "$OUT/old-251.sh" ] && [ -s "$OUT/old-253.sh" ] || die "could not extract the old blocks"

# Disk text == rendered text only if no code line carries `$0` (the harness rewrites it
# when rendering a command file). Comments may name it; code may not.
for f in "$OUT/old-251.sh" "$OUT/old-253.sh"; do
  if grep -vE '^[[:space:]]*#' "$f" | grep -q '\$0'; then
    die "$(basename "$f") has \$0 on a code line — its disk text is not what the skill ran"
  fi
done
# The base-ref substitution must be EXACT: one code site in 2.5.1, none in 2.5.3.
SITE='git merge-base origin/development HEAD'
# (echo lines only print the ref's name, and never fire here: every merge has a base.)
n=$(grep -vE '^[[:space:]]*(#|echo )' "$OUT/old-251.sh" | grep -c 'origin/development' || true)
[ "$n" -eq 1 ] || die "expected exactly 1 code line naming origin/development in 2.5.1, found $n"
[ "$(grep -cF "$SITE" "$OUT/old-251.sh")" -eq 1 ] || die "the merge-base site moved — update SITE"
n=$(grep -vE '^[[:space:]]*(#|echo )' "$OUT/old-253.sh" | grep -c 'origin/development' || true)
[ "$n" -eq 0 ] || die "2.5.3 has $n code line(s) naming origin/development — they need substituting too"

CANON='
canon() {
  printf "GATE_REQUIRED=%s\n" "$GATE_REQUIRED"
  printf "FULL_SUITE=%s\n" "$FULL_SUITE"
  printf "FLOWS#%s\n" "${#FLOWS[@]}"
  for _x in "${FLOWS[@]}"; do printf "FLOWS[%s]\n" "$_x"; done
  printf "DYNAMIC_TYPE_FLOWS#%s\n" "${#DYNAMIC_TYPE_FLOWS[@]}"
  for _x in "${DYNAMIC_TYPE_FLOWS[@]}"; do printf "DYNAMIC_TYPE_FLOWS[%s]\n" "$_x"; done
  printf "SAFETY_CHANGED<<%s>>\n" "$SAFETY_CHANGED"
  printf "CRISIS_HOST_CHANGED<<%s>>\n" "$CRISIS_HOST_CHANGED"
}'
{
  echo 'DIFF_BASE="$1"; DUMP="$2"'
  echo "$CANON"
  sed "s|$SITE|git merge-base \"\$DIFF_BASE\" HEAD|" "$OUT/old-251.sh"
  echo 'GATE_REQUIRED=""'
  echo 'if [ -n "$SAFETY_CHANGED" ] || [ -n "$CRISIS_HOST_CHANGED" ]; then'
  echo 'GATE_REQUIRED=1'
  cat "$OUT/old-253.sh"
  echo 'fi'
  echo 'canon > "$DUMP"'
} > "$OUT/old-combined.sh"
bash -n "$OUT/old-combined.sh" || die "old-combined.sh does not parse"
printf '%s\n' "$CANON" > "$OUT/canon.sh"

# b-batch's unanchored copy, for the anchoring divergence count (crisis question c).
git -C "$REPO" show "$OLD_REV:.claude/commands/b-batch.md" > "$OUT/old-b-batch.md" || die "show b-batch.md"
BATCH_RE=$(grep -oE "'app/\([^']*\)'" "$OUT/old-b-batch.md" | head -1 | sed "s/^'//; s/'\$//")
NEW_RE=$(bash "$SCRIPT" --print-regex) || die "--print-regex failed"
[ -n "$BATCH_RE" ] && [ -n "$NEW_RE" ] || die "could not read both regexes"
printf '%s\n' "$BATCH_RE" > "$OUT/batch-re.txt"; printf '%s\n' "$NEW_RE" > "$OUT/new-re.txt"

# --- merge list --------------------------------------------------------------
if [ -z "$MERGES" ]; then
  MERGES="$OUT/merges.txt"
  git -C "$REPO" rev-list --merges origin/development > "$MERGES" || die "rev-list failed"
fi
TOTAL=$(grep -c . "$MERGES")
[ "$TOTAL" -gt 0 ] || die "empty merge list"

# --- one worker --------------------------------------------------------------
worker() {
  local k="$1" wt="$OUT/wt-$k" tmp="$OUT/tmp-$k" res="$OUT/results-$k.tsv" i=0 m p1 p2 mb d
  mkdir -p "$tmp"; : > "$res"
  git -C "$REPO" worktree add -q --detach -f "$wt" "$(head -1 "$MERGES")^2" 2>/dev/null || {
    echo "WORKER_FAIL	$k	worktree add" >> "$res"; return; }
  while IFS= read -r m; do
    i=$((i + 1)); [ $(( (i - 1) % JOBS )) -eq "$k" ] || continue
    [ -n "$m" ] || continue
    p1="$(git -C "$REPO" rev-parse "$m^1")"; p2="$(git -C "$REPO" rev-parse "$m^2")"
    d="$OUT/m/$m"; mkdir -p "$d"
    git -C "$wt" checkout -q -f --detach "$p2" 2>"$d/checkout.err" || { echo "ERROR	$m	checkout" >> "$res"; continue; }
    git -C "$wt" clean -fdq >/dev/null 2>&1
    ( cd "$wt" && bash "$OUT/old-combined.sh" "$p1" "$d/old.vars" >"$d/old.out" 2>"$d/old.err" ); echo $? > "$d/old.rc"
    rm -rf "$tmp/b-close-gate-plan"
    TMPDIR="$tmp" bash "$SCRIPT" --worktree "$wt" --base "$p1" >"$d/new.out.raw" 2>"$d/new.err"; echo $? > "$d/new.rc"
    grep -vE '^(ℹ️  No safety-surface changes detected — skipping Maestro e2e gate|📄 Gate plan: .*)$' \
      "$d/new.out.raw" > "$d/new.out"
    local plan; plan="$(TMPDIR="$tmp" bash "$SCRIPT" --worktree "$wt" --plan-path)"
    local why=""
    cmp -s "$d/old.rc" "$d/new.rc" || why="$why rc"
    cmp -s "$d/old.out" "$d/new.out" || why="$why stdout"
    cmp -s "$d/old.err" "$d/new.err" || why="$why stderr"
    if [ "$(cat "$d/old.rc")" = 0 ]; then
      if [ -f "$plan" ]; then
        bash -c ". \"$OUT/canon.sh\"; . \"$plan\"; canon" > "$d/new.bash.vars" 2>&1
        zsh  -c ". \"$OUT/canon.sh\"; . \"$plan\"; canon" > "$d/new.zsh.vars" 2>&1
        cmp -s "$d/old.vars" "$d/new.bash.vars" || why="$why vars(bash)"
        cmp -s "$d/old.vars" "$d/new.zsh.vars"  || why="$why vars(zsh)"
        cp "$plan" "$d/plan.env"
      else
        why="$why no-plan-file"
      fi
    else
      [ -f "$plan" ] && why="$why plan-file-on-failure"
    fi
    # Anchored (script) vs unanchored (old b-batch) path classification.
    mb="$(git -C "$REPO" merge-base "$p1" "$p2" 2>/dev/null)"
    local names a b
    names="$(git -C "$REPO" diff --name-only "$mb" "$p2" | grep -vE '(__tests__/|\.test\.|\.spec\.)')"
    a="$(printf '%s\n' "$names" | grep -E "$(cat "$OUT/new-re.txt")")"
    b="$(printf '%s\n' "$names" | grep -E "$(cat "$OUT/batch-re.txt")")"
    local anch="same"; [ "$a" = "$b" ] || anch="DIVERGE"
    if [ -z "$why" ]; then
      echo "SAME	$m	$(cat "$d/new.rc")	$anch" >> "$res"
      # Keep only what the coverage report reads.
      find "$d" -type f ! -name plan.env ! -name new.out -delete
    else echo "DIFF	$m	$why	$anch" >> "$res"; fi
  done < "$MERGES"
  git -C "$REPO" worktree remove --force "$wt" >/dev/null 2>&1
}

echo "Comparing $TOTAL merge(s) with $JOBS worker(s); old blocks from $OLD_REV; script $SCRIPT"
START=$(date +%s)
rm -rf "$OUT/m"; mkdir -p "$OUT/m"
k=0; while [ "$k" -lt "$JOBS" ]; do worker "$k" & k=$((k + 1)); done
wait
git -C "$REPO" worktree prune
cat "$OUT"/results-*.tsv > "$OUT/results.tsv"
SAME=$(grep -c '^SAME' "$OUT/results.tsv" || true)
DIFF=$(grep -c '^DIFF' "$OUT/results.tsv" || true)
ERR=$(grep -cE '^(ERROR|WORKER_FAIL)' "$OUT/results.tsv" || true)
DIVERGE=$(grep -c 'DIVERGE$' "$OUT/results.tsv" || true)
ALARM=$(awk -F'\t' '$1=="SAME" && $3==1' "$OUT/results.tsv" | wc -l | tr -d ' ')
{
  echo "old-rev: $OLD_REV ($(git -C "$REPO" rev-parse "$OLD_REV"))"
  echo "script:  $SCRIPT ($(shasum -a 256 "$SCRIPT" | cut -c1-16))"
  echo "merges:  $TOTAL · compared $((SAME + DIFF)) · same $SAME · DIFF $DIFF · errors $ERR · $(( $(date +%s) - START ))s"
  echo "INFRA-531 alarms (rc 1, matched): $ALARM"
  echo "anchored-vs-unanchored (b-batch) divergence: $DIVERGE"
} > "$OUT/summary.txt"
grep -E '^(DIFF|ERROR|WORKER_FAIL)' "$OUT/results.tsv" | head -20 >> "$OUT/summary.txt"

# --- coverage (crisis ruling): how many merges exercised each outcome -------------
# Per-clause counts test each Step 2.5.3 clause's own pattern against the plan's
# SAFETY_CHANGED — BEFORE the RENDER_BOOT_RELEVANT carve-out, so a carved-out security
# or crisis-service path still counts toward its pattern. An approximation, labelled so.
# A zero row is covered by fixtures only.
{
  echo
  echo "== coverage over compared merges =="
  plans=$(find "$OUT/m" -name plan.env 2>/dev/null)
  if [ -n "$plans" ]; then
    printf '  %-48s %s\n' "gate required" "$(grep -l '^GATE_REQUIRED=1' $plans | wc -l | tr -d ' ')"
    printf '  %-48s %s\n' "FULL_SUITE" "$(grep -l '^FULL_SUITE=1' $plans | wc -l | tr -d ' ')"
    printf '  %-48s %s\n' "crisis content detector (CRISIS_HOST_CHANGED)" "$(grep -L "^CRISIS_HOST_CHANGED=''" $plans | wc -l | tr -d ' ')"
    echo "  -- flows (merges whose plan carries each) --"
    grep -hE '^(FLOWS|DYNAMIC_TYPE_FLOWS)=\(' $plans | sed -E 's/^([A-Z_]+)=\((.*)\)$/\1 \2/' \
      | awk '{for(i=2;i<=NF;i++) c[$1" "$i]++} END{for(k in c) printf "  %-48s %d\n", k, c[k]}' | sort
    echo "  -- banners (first line, merges printing it) --"
    for o in $(find "$OUT/m" -name new.out); do grep -E '^[^[:space:]]' "$o" | sort -u; done \
      | grep -vE '^(declare|FLOWS)' | cut -c1-70 | sort | uniq -c | sort -rn | sed 's/^/  /'
    echo "  -- Step 2.5.3 clause patterns vs SAFETY_CHANGED (pre-carve-out) --"
    grep -oE 'RENDER_BOOT_RELEVANT" \| grep -qE? '"'"'[^'"'"']+'"'"'' "$SCRIPT" \
      | sed -E "s/^.*grep -qE? '//; s/'\$//" | sort -u | while IFS= read -r pat; do
        n=0
        for pl in $plans; do
          ( . "$pl"; printf '%s\n' "$SAFETY_CHANGED" | grep -qE "$pat" ) && n=$((n + 1))
        done
        printf '  %5d  %s\n' "$n" "$pat"
      done
  fi
} >> "$OUT/summary.txt"
cat "$OUT/summary.txt"

if [ "$ERR" -gt 0 ] || [ $((SAME + DIFF)) -ne "$TOTAL" ]; then
  echo "harness error: not every merge was compared"; exit 2
fi
if [ -n "$EXPECT_DIFF" ]; then
  [ "$DIFF" -gt 0 ] && { echo "RED as expected: $DIFF difference(s)"; exit 0; }
  echo "GREEN — expected differences"; exit 1
fi
[ "$DIFF" -eq 0 ] && { echo "ZERO DIFFERENCES"; exit 0; }
echo "$DIFF DIFFERENCE(S)"; exit 1
