# /b-close Phase 2.5 — gate steps (loaded on demand)

Read this file only when Step 2.5.1 printed `🔒 GATE REQUIRED`. It holds Steps 2.5.3,
2.5.4 and 2.5.5, moved from `/b-close` (INFRA-723) with their numbers unchanged; Step 2.5.3's
mapping itself runs inside `.claude/scripts/b-close-gate-plan.sh` (INFRA-727). Every other
step they name lives in `/Users/max/dev/being/.claude/commands/b-close.md`.

Order on an active gate: Step 2.5.3 here → Step 2.5.3a in `b-close.md` → Steps 2.5.4–2.5.5
here, unless 2.5.3a detached → Step 3.1 in `b-close.md`.

**Read `/Users/max/dev/being/.claude/docs/e2e-gotchas.md` before running or debugging anything below.** The build, provenance,
background-run and abort rules these steps assume live there (moved from `CLAUDE.md`,
INFRA-725); `CLAUDE.md` keeps only one line per rule.

---

### Step 2.5.3: Map changed paths to scoped flow(s)

Already done. Since INFRA-727 the mapping runs in Step 2.5.1's script
(`/Users/max/dev/being/.claude/scripts/b-close-gate-plan.sh`, its "Step 2.5.3" section), in the same process as detection, and its output is
above. The plan's variables:

| Variable | Meaning | Step 2.5.5 does |
|---|---|---|
| `FULL_SUITE=1` | A cross-cutting change: `core/navigation`, `e2eSeed.ts`, an unmapped flow, a helper whose caller set cannot be proven | Runs the tagged suite with NO arguments; `FLOWS` is empty by construction |
| `FLOWS=(…)` | The minimal flow set pinning the touched surfaces, sorted and deduped | One `e2e-safety.sh` invocation over all of them (INFRA-483) |
| `DYNAMIC_TYPE_FLOWS=(…)` | `safety-dynamic-type` flows (DEBUG-546), never merged into `FLOWS` | Runs them through `e2e-dynamic-type.sh` after the suite |
| `GATE_REQUIRED=1` and all three empty | The SERVICE-LAYER ONLY skip (MAINT-237): jest owns the surface | No sim build; a detached close takes `--no-flows` |

The printed notices are instructions, not decoration:
- **`No Step 2.5.3 clause matched a render/boot-relevant change`** — the fail-safe ran
  `crisis-button-reachability`. It is NOT a scope: it proves 988 reachability only. The listed
  paths need an arm; say so in the close-out.
- **NECESSARY, NOT SUFFICIENT** — the arm cannot falsify the contract the notice names. Carry
  its falsifier (a jest pin, an attended device step, a command) into the close-out, and run
  any command it gives.
- **`This close does NOT verify them`** and **`arm-set drift`** — a recorded gap or a stale
  arm set, never a pass. Quote them.

To change a mapping: edit the script's Step 2.5.3 section, add a case to
`test-b-close-gate-plan.sh` (bump `EXPECTED_CASES`), update `b-close.md`'s decision table, and
get a `crisis` review. The script's header says why.

---

*Step 2.5.3a lives in `b-close.md`. Return here for Step 2.5.4 only if it kept the session attached.*

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

**That re-check has two shortcuts, and both fail toward NOT gating.** Diff
`$(git merge-base origin/development HEAD)..origin/development`, never
`HEAD origin/development` — the latter is symmetric and lists your own files as
incoming. And classify with the script, never a copy of its regex — an abbreviated copy
silently drops entries and reports a clean incoming set. A non-zero exit is not "clean":

```bash
bash /Users/max/dev/being/.claude/scripts/b-close-gate-plan.sh --worktree /Users/max/dev/being/[worktree-dir] --candidates-only \
  --range "$(git -C /Users/max/dev/being/[worktree-dir] merge-base origin/development HEAD)..origin/development"
```

**SECOND — is this worktree's build script the new one?** `.claude/` is shared across every
worktree (it lives on `_bare`), but `app/scripts/e2e-sim-build.sh` is **app code**, so it
arrives only when INFRA-383 is on *this branch*. Until a branch back-merges `development`,
the guidance below describes a build that worktree cannot produce. Detect it rather than
letting the operator discover it 12 minutes in:

```bash
GATE_PLAN="$(bash /Users/max/dev/being/.claude/scripts/b-close-gate-plan.sh --worktree /Users/max/dev/being/[worktree-dir] --check-plan)" && . "$GATE_PLAN" || exit 2
# INFRA-483: FULL_SUITE means "run the tagged suite with no arguments", so an empty
# FLOWS[] does NOT mean "no flows" — check both or a cross-cutting change skips the
# readiness guards entirely and enters the gate with no simulator.
if [ ${#FLOWS[@]} -gt 0 ] || [ -n "$FULL_SUITE" ] || [ ${#DYNAMIC_TYPE_FLOWS[@]} -gt 0 ]; then
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
GATE_PLAN="$(bash /Users/max/dev/being/.claude/scripts/b-close-gate-plan.sh --worktree /Users/max/dev/being/[worktree-dir] --check-plan)" && . "$GATE_PLAN" || exit 2
if [ ${#FLOWS[@]} -gt 0 ] || [ -n "$FULL_SUITE" ] || [ ${#DYNAMIC_TYPE_FLOWS[@]} -gt 0 ]; then
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
GATE_PLAN="$(bash /Users/max/dev/being/.claude/scripts/b-close-gate-plan.sh --worktree /Users/max/dev/being/[worktree-dir] --check-plan)" && . "$GATE_PLAN" || exit 2
# Only require a simulator when there are flows to run. A service-layer-only safety
# change (Step 2.5.3) resolves to zero flows and closes with no sim build at all.
if [ ${#FLOWS[@]} -gt 0 ] || [ -n "$FULL_SUITE" ] || [ ${#DYNAMIC_TYPE_FLOWS[@]} -gt 0 ]; then
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
GATE_PLAN="$(bash /Users/max/dev/being/.claude/scripts/b-close-gate-plan.sh --worktree /Users/max/dev/being/[worktree-dir] --check-plan)" && . "$GATE_PLAN" || exit 2
cd /Users/max/dev/being/[worktree-dir]/app
if [ ${#FLOWS[@]} -eq 0 ] && [ -z "$FULL_SUITE" ]; then
  [ ${#DYNAMIC_TYPE_FLOWS[@]} -eq 0 ] && \
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
       echo "   If it reproduces intermittently, attribute before fixing: re-run the SAME"
       echo "   binary for a rate, then the same flow on an origin/development control."
       echo "   A tree yielding both a high and a zero rate is not the variable; record the"
       echo "   rate and the untested window rather than reading a later green as proof."
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

# DEBUG-546 — the safety-dynamic-type flows Step 2.5.3 armed, AFTER the suite so the suite
# keeps running at the default size. Its own invocation: the wrapper sets the content size,
# runs e2e-safety.sh on the named flows, and restores the size in a trap. Same exit alphabet.
if [ ${#DYNAMIC_TYPE_FLOWS[@]} -gt 0 ]; then
  export E2E_REQUIRE_CLEAN_PROVENANCE=1
  export E2E_RECEIPT_PATH="${TMPDIR:-/tmp}/being-close-receipt-dt-$$.txt"
  echo "🔠 Running ${#DYNAMIC_TYPE_FLOWS[@]} dynamic-type flow(s) at AX5: ${DYNAMIC_TYPE_FLOWS[*]}"
  bash scripts/e2e-dynamic-type.sh "${DYNAMIC_TYPE_FLOWS[@]}"
  DT_RC=$?
  case "$DT_RC" in
    0) echo "✅ Dynamic-type flows passed" ;;
    1) echo "❌ A dynamic-type flow FAILED. Its breath step taps Skip inside a 30s app timer:"
       echo "   check the receipt's host load before reading the red as the app, re-run once"
       echo "   on a quiet machine if it was contended, and never reach for --skip-e2e."
       echo "   Receipt: $E2E_RECEIPT_PATH"
       exit 1 ;;
    2|3|4) echo "❌ e2e-dynamic-type.sh exited $DT_RC — no verdict (2 harness, 3 target replaced,"
       echo "   4 peer holds the slot). Read it exactly as the suite arms above."
       exit 1 ;;
    *) echo "❌ e2e-dynamic-type.sh exited $DT_RC — unrecognised. Treat as no verdict."
       exit 1 ;;
  esac
  CERT_HELPER="$(git rev-parse --show-toplevel)/app/scripts/b-close-verdict.sh"
  if [ -r "$CERT_HELPER" ]; then
    # shellcheck source=/dev/null
    . "$CERT_HELPER"
    DT_CERT="$(b_close_stage_verdict certification \
      "$(b_close_certification_verdict "$E2E_RECEIPT_PATH" "${DYNAMIC_TYPE_FLOWS[@]}")")"
    b_close_mergeable "$DT_CERT" || {
      echo "❌ $DT_CERT for ${DYNAMIC_TYPE_FLOWS[*]} — green but not certified; the"
      echo "   certification arms above say what to boot. Receipt: $E2E_RECEIPT_PATH"
      exit 1
    }
  fi
fi
```

Proceed to Step 3.1 only on success.

**Use the wait.** The build (~7 min post-regen, 21 min cold) and the flow run are dead
time on the critical path, and everything downstream is already knowable: draft Step 3.3's
PR body and Step 4.2's Notion comment while they run, so both paste straight in when the
gate goes green. Draft in the scratchpad, never the worktree — an untracked file there
reads as MISMATCH on the next provenance verify and costs a rebuild (`e2e-gotchas.md`).

**`development` can advance while the gate runs.** After Phase 2.5 completes, re-check
`git rev-list --count HEAD..origin/development`. If the new commits leave your NET diff
free of runtime code, proceed and record that reasoning — re-gating would validate their
changes, not yours. If your net diff still carries runtime code, re-merge and re-gate.

**While `development` is moving, run CI and the gate on the same commit.** Push and open
the PR as a draft when the gate launches; mark it ready and merge only when both are green
on that commit.
