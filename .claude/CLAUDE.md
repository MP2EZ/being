# Being

## What This Is

Stoic Mindfulness mental wellness app. Consumer wellness — not a healthcare provider, medical device, or HIPAA-covered entity. PHQ-9 and GAD-7 are wellness self-screening tools, not clinical assessments. Solo-founder project under Palouse Labs LLC.

## Repo Layout

Bare git repo at `~/dev/being/` with a long-lived worktree at `~/dev/being/development/` plus feature worktrees created by `/b-work`. **There is deliberately no `main` worktree.** `main` is only ever a ref here — the release moves it, nothing checks it out — and while one existed it silently desynced on every release (`update-ref` advances the pointer without touching a checked-out worktree). Need to inspect or branch from shipped state? Create one on demand: `git -C ~/dev/being worktree add ~/dev/being/<slug> -b <branch> origin/main`. Always launch `claude` from `~/dev/being/` (the bare-repo root). The app code lives under each worktree's `app/` directory.

## Tech Stack

- React Native `0.85.3`, Expo `56`, React `19.2.3` (pinned — see version-check script in `app/package.json`)
- Supabase (auth + DB), Zustand `5` (state), Stripe (subscriptions), Sentry (monitoring), expo-secure-store + react-native-aes-crypto (encryption)
- TypeScript `6.0.x` strict (SDK 56 default; landed in MAINT-162), Jest (unit/integration) + Maestro (safety-path e2e, local-only — INFRA-171)

## Setup & Run

```bash
cd app
npm start                  # Expo dev server
npm run ios                # iOS simulator
npm run android            # Android emulator
```

## Source Architecture

```
app/src/
├── core/         # Infrastructure: analytics, security, services, stores, types
└── features/     # Domain features: assessment, crisis, practices, learn, ...
```

Path aliases: `@/core/*`, `@/features/*`. Prefer aliases over relative imports. Types co-located with their consumers.

## Protected Paths → Specialist Agent

Editing these areas should invoke the matching agent for a planning pass before implementing:

| Path | Agent(s) |
|---|---|
| `app/src/features/crisis/` | `crisis` |
| `app/src/features/assessment/` | `crisis` + `philosopher` |
| `app/src/features/practices/` | `philosopher` |
| `app/src/features/practices/dailyloop/` | `crisis` + `philosopher` |
| `app/src/features/guidance/` | `crisis` + `philosopher` |
| `app/src/features/consent/` | `crisis` + `compliance` |
| `app/src/features/journal/` | `crisis` |
| `app/src/core/services/security/` | `compliance` |
| `app/src/core/stores/consentStore.ts` | `crisis` + `compliance` |
| `app/src/core/hooks/` | `crisis` |
| `app/src/core/components/ThresholdEducationModal.tsx` | `crisis` + `philosopher` |
| `app/src/features/insights/components/` | `crisis` + `philosopher` |
| `app/src/features/insights/screens/InsightsScreen.tsx` | `crisis` |
| `app/src/features/home/screens/CleanHomeScreen.tsx` | `crisis` |
| `app/src/features/profile/screens/DeleteAccountScreen.tsx` | `crisis` |
| `app/src/features/profile/screens/ExportDataScreen.tsx` | `crisis` |
| `app/src/features/profile/screens/PrivacyDataScreen.tsx` | `crisis` |
| `app/src/core/services/logging/ExternalErrorReporter.ts` | `crisis` |
| `app/src/features/profile/screens/ProfileScreen.tsx` | `crisis` |
| `app/plugins/` | `crisis` |
| `app/src/core/services/speech/` | `crisis` |
| `app/patches/` | `crisis` |
| `app/src/core/navigation/` | `crisis` |
| `app/src/core/config/e2eSeed.ts` | `crisis` |
| `app/src/core/services/supabase/SupabaseService.ts` | `crisis` + `compliance` |
| `app/App.tsx` | `crisis` |
| `app/src/core/analytics/PostHogProvider.tsx` | `crisis` + `compliance` |
| `app/src/core/components/BugReportOverlay.tsx` | `crisis` |
| `app/src/core/stores/bugReportStore.ts` | `crisis` |
| `app/src/features/practices/shared/components/HapticsOptInPrompt.tsx` | `crisis` + `philosopher` |
| `app/src/features/practices/shared/components/ResumeSessionModal.tsx` | `crisis` + `philosopher` |
| `app/src/features/practices/shared/haptics/` | `crisis` |
| `app/src/features/practices/shared/components/BreathingCircle.tsx` | `crisis` |
| `app/src/features/practices/shared/useIsFocusedSafe.ts` | `crisis` |
| `app/src/features/learn/practices/PracticeTimerScreen.tsx` | `crisis` |
| `app/src/features/learn/practices/ReflectionTimerScreen.tsx` | `crisis` |
| `app/src/features/learn/practices/BodyScanScreen.tsx` | `crisis` |
| `app/src/features/learn/practices/GuidedBodyScanScreen.tsx` | `crisis` |
| `app/src/features/learn/practices/SortingPracticeScreen.tsx` | `crisis` + `philosopher` |
| `app/src/features/learn/practices/shared/PracticeToggleButton.tsx` | `crisis` |
| `app/src/features/learn/practices/shared/usePracticeCompletion.tsx` | `crisis` |
| `app/src/features/learn/practices/PracticeCompletionScreen.tsx` | `crisis` + `philosopher` |
| `app/src/features/practices/screens/PracticeLibraryScreen.tsx` | `crisis` + `philosopher` |
| `app/assets/passages/` | `crisis` + `philosopher` |
| `app/src/core/services/security/DeepLinkValidationService.ts` | `crisis` + `compliance` |

Per-row rulings — why each row exists, its FILE-vs-DIRECTORY call, and what is deliberately
NOT gated (`IAPService.ts`, `practiceSafeAreaEdges.ts`) — live in
`/Users/max/dev/being/.claude/docs/safety-path-rulings.md`. Read the paragraph naming a path
before ruling on a new one or changing a file already in the table. **New ruling prose goes in the rulings file, never here.**

**The two lists are reconciled mechanically** — `.claude/scripts/check-safety-paths.sh`
(INFRA-416) fails when a Protected Path is neither in Phase 2.5's `SAFETY_PATH_RE`
(`.claude/scripts/b-close-gate-plan.sh`, INFRA-727) nor in its declared exemption list. Run it
after editing either list; `/b-close` Phase 0 runs it too. It is deliberately **not** a CI job: both files are tracked only on `_bare` and
gitignored on `development`, so a CI checkout cannot read them — and Phase 2.5's Maestro gate
is itself local-only, so a CI guard would go green on a list for flows CI never runs.
Adding a row to the table above without doing one or the other will fail that check.

**Standing rule for the next instance:** gate the directory when
every non-crisis member can be named in the justification prose and each has been reviewed;
otherwise name the files. A directory clause that over-fires costs a build that announces
itself; a file list that under-fires is silent, which is how five instances accumulated.

**No detector reaches every shape, so for these the table is the only control.** INFRA-531's
crisis-import alarm is a supplement, not a replacement — a diff signal, not a set; it maps no
agent and inverts on extracted primitives — and it cannot see a file that imports nothing from
`features/crisis/`: a third-party occluder or presenter call (`ExternalErrorReporter.ts`,
`ExportDataScreen.tsx`), a render-withholding ancestor (`App.tsx`, `PostHogProvider.tsx`), a store
that alone gates an overlay (`bugReportStore.ts`), the crisis audit sink (`SupabaseService.ts`),
output emitted toward a crisis surface (`shared/haptics/`, `BreathingCircle.tsx`), process death
on the scan path (`speech/`), native config (`plugins/`, `patches/`), or a shared style, hook or
focus signal gated hosts route through (`PracticeToggleButton.tsx`, `usePracticeCompletion.tsx`,
`useIsFocusedSafe.ts`). `check-modal-occlusion-guard.js` arms no gate, and a Step 2.5.3 carve-out
can strip a gated path (`DeepLinkValidationService.ts`). Neither silence means a path needs no
row. A row stands on its own: never rely on a co-edited gated file or `CRISIS_HOST_CHANGED` to
arm the gate (DEBUG-390).

Specialist agents live in `.claude/agents/{crisis,compliance,philosopher}.md` and self-describe via frontmatter.

## Safety Facts (non-negotiable)

- **PHQ-9 thresholds**: ≥15 = support resources offered; ≥20 = active intervention. Q9 (self-harm) >0 = immediate intervention regardless of total.
- **GAD-7 threshold**: ≥15 = support resources offered.
- **988 access**: <3 taps from any screen, <3 seconds load.
- **Crisis detection (score path)**: <200ms, audit-logged, **zero false negatives** — `detectCrisis()` over PHQ-9/GAD-7 integers, which is total and deterministic. This is where the zero-FN contract lives.
- **Crisis detection (free text)**: `textCrisisDetection` is a fixed keyword set — high precision, **recall unmeasured with verified misses** (INFRA-512 §3). Never cite it as zero-false-negative; a null scan is not evidence of no crisis.
- **Wellness data encryption**: AES-256 at rest via `expo-secure-store` / `react-native-aes-crypto`. (Terminology: "wellness data," not "PHI" — Being is not a HIPAA entity.)

## Performance Budgets

| Metric | Target |
|---|---|
| App launch | <2s |
| Crisis button response | <200ms |
| Check-in flow transition | <500ms |
| Assessment load | <300ms |
| Breathing circle animation | 60fps |

## Test & Validate Commands

```bash
npm run typecheck                  # tsc --noEmit
npm run lint                       # eslint src
npm run lint:clinical              # stricter rules for clinical/safety code
npm run test                       # full jest suite
npm run test:clinical              # PHQ/GAD scoring + thresholds
npm run test:crisis-detection      # crisis detection validation
npm run test:accessibility         # WCAG AA
npm run test:offline-crisis        # offline 988 access
npm run validate:accessibility     # accessibility validation

# Safety-path e2e (Maestro, local-only — INFRA-171)
npm run e2e:safety                 # the 15 sim-runnable safety flows (a jest tripwire pins the count)
npm run e2e:safety:q9              # PHQ-9 Q9 single-alert pinning
npm run e2e:safety:phq9            # PHQ-9 ≥20 completion path
npm run e2e:safety:gad7            # GAD-7 ≥15 severe handoff
npm run e2e:safety:crisis-button   # crisis button reachability from each tab
npm run e2e:safety:988-dial        # ⛔ refuses (exit 5) — no Maestro can drive a device, DEBUG-589
```

## Validation Matrix

Which validators are required for which work type. `crisis`, `compliance`, `philosopher` are specialist agents. Accessibility is validated via `npm run test:accessibility` / `validate:accessibility`.

**Performance budgets are only partly enforced — know which (corrected MAINT-307).** This section previously claimed they are "enforced on-device via the Maestro flows under `app/.maestro/`". **They are not.** Verified across all 8 flows: there is not one ms or fps assertion, only `timeout:` failure ceilings; `crisis-button-reachability.yaml:34-35` says so itself. What actually holds:

| Budget | Enforced by |
|---|---|
| Crisis detection <200ms | **Strict CI gate** — `__tests__/performance/assessment-performance.test.ts`, run by the `Performance regression` job |
| Crisis button <200ms | **Not measured in CI — contract-pinned only (corrected DEBUG-596).** The instrument is `features/crisis/services/crisisTapTrace.ts` (tap→`screen_commit` / tap→`url_open`, never aggregated); `crisisTapTrace.contract.test.ts` pins WHICH outcome and severity a completed vs. dropped tap records — a contract, not a timing. `CollapsibleCrisisButton.behavioral.test.tsx`'s elapsed-time assertion measures synthetic dispatch, the quantity INFRA-297's own header condemns, and is NOT evidence for this budget. The tap→render number is device-only and hand-read, like the 60fps row |
| Breathing 60fps | **Structural proxy only — the frame rate is still unmeasured.** INFRA-306 shipped `npm run check:breathing-worklets` (CI, `Performance regression` job): it fails if the PERF-01/PERF-02 shape returns to the animation path — `runOnJS`/state-setter inside a `useAnimatedStyle`/`useDerivedValue`/`useAnimatedReaction`/`useFrameCallback` body, `requestAnimationFrame` on that path, or `BreathingCircle` losing `React.memo` / its module-scope prop constants. It does **not** measure frames and cannot: CI is 100% `ubuntu-latest`. INFRA-373 built the on-device measurement — `BreathingFrameProbe` + a pure, unit-tested accumulator behind `EXPO_PUBLIC_PERF_HUD` — and it is a **hand-read instrument, not a gate**: nothing asserts on its output. Automating it needs a device Maestro flow, which DEBUG-589 established no Maestro version can run. Measured 2026-09-07, iPhone 16e/60Hz: 599 frames, nominal 16.66ms, zero drops. Derive nominal from the **modal** interval, never the minimum (measured min 16.42 is biased low). Procedure, evidence and the two still-owed control runs: `post-launch-monitoring-runbook.md` §5a |
| App launch <2s, check-in transition <500ms | **Nothing** — hand-validated |

The jest-side `perf:*` scripts were removed in MAINT-166 PR 7 (they ran zero matching tests). `__tests__/reporters/performance-regression-reporter.js` does **not** gate: it is non-strict unless `PERF_REGRESSION_STRICT=true`, so `performance-baselines.json`'s `crisis_response_ms` is a recorded baseline, not a threshold. A "performance" cell below therefore means *the budget applies*, not *a gate will catch you*.

| Work Type | crisis | compliance | philosopher | accessibility | performance | safety e2e |
|---|---|---|---|---|---|---|
| Crisis features | required | required | — | required | <200ms required | required |
| Assessment UI | required (thresholds) | — | — | required | — | required |
| Therapeutic content (Stoic) | — | — | required | required | 60fps if animation | — |
| Privacy / wellness data export | — | required | — | if UI | — | — |
| General UI | — | — | — | required | — | — |
| Backend-only | — | — | — | — | — | — |

Safety e2e = Maestro flow in `app/.maestro/` pinning the user-visible contract. Gated by `/b-close` Phase 2.5 when safety paths change. Authoring guide: `docs/testing/e2e-maestro.md`.

**What the safety gate does NOT cover — telemetry (INFRA-400, corrected INFRA-412).** A green gate verifies UI reachability and thresholds, never that `crisis_detected` reaches Supabase. **Read a zero-row `analytics_events` against the BUILD, not against the table** — zero rows is NOT the expected reading in every build, though it once was:

| Build | Zero rows means |
|---|---|
| Gate build (`npm run e2e:safety:build`) | **Expected.** INFRA-411 suppresses egress at `flushCrisisAnalytics`: `if (env.EXPO_PUBLIC_E2E_SEED_ONBOARDED === 'true') return;`. That flag exists only in `eas.json`'s `e2e-sim` profile. Events are retained, never dropped. |
| Normal Release build (`.env.production`) | **A REGRESSION.** Delivery is proven (INFRA-412: a Q9>0 detection landed a row in 576 ms). |

To reproduce delivery, never use `npm run e2e:safety:build` (suppressed by construction) — build from `.env.production` and assert which env won inside the bundle. The DEBUG-409 defect, the INFRA-412 measurement and the full procedure: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § Crisis telemetry.
## State (Zustand)

Stores live with their owners: `core/stores/` (bugReport,
consent, settings, subscription) and per feature
(`assessment/stores/assessmentStore`,
`practices/stores/stoicPracticeStore`,
`learn/stores/educationStore`). There is no crisis store —
no safety plan or emergency contacts exist (DEBUG-608). What
is encrypted is a per-store fact: read the store, not this list.

## Design System

Uses the `@mp2ez/being-design-system` npm package. Theme tokens imported from `@/core/theme`. UI work imports `colorSystem`, `semantic`, `spacing`, `borderRadius`, `typography` from there. **No hardcoded hex colors, magic-number spacing, or inline fontSize.** Themes vary by time of day (`morning|midday|evening`) via `getTheme(flowType)`.

## Branch Model (GitHub Flow — INFRA-145)

Two long-lived branches:
- **`main`** — last-shipped state. Updated only via `development → main` release PRs (created by `/b-release`) or `hotfix/* → main` PRs. TestFlight + App Store build from this branch.
- **`development`** — integration branch. All feature / chore / fix branches PR into this. Each merge is "ready to release"; multiple can accumulate before a release.

Short-lived branches:
- `feat/*`, `fix/*`, `chore/*` — branched off `development`, PR'd to `development`, deleted on merge.
- `hotfix/*` — branched off `main` (NOT dev), PR'd to `main`. After merge: **cherry-pick** the hotfix commit onto `development` (decision: cherry-pick over rebase, keeps dev's force-push protection on).

**Branch protection**: both `main` and `development` require `CI pass` (10 strict gates), enforce admins, prevent force-push and deletion, and require PRs (no direct push). Use `gh pr merge --admin` for solo workflow speed. "No direct push" is literal and applies to you: `required_pull_request_reviews` is present with 0 required approvals, and `enforce_admins: true` extends it to admins, so `git push origin development` is rejected with `GH006` — see the Hotfix Process below, whose backport step used to get this wrong.

**When CI runs**: `ci.yml` fires on `pull_request` (into `main` or `development`) and on `push` to **`main` and `development` only**. Short-lived branches are deliberately absent from the `push:` trigger — they used to be there, and every commit on one with an open PR produced *two* complete runs on the same SHA (22 check rows per PR), which is how INFRA-329 happened: `gh pr checks --watch` read only one of the two and reported all-green on a red commit. Since every short-lived branch PRs into a protected branch, the `pull_request` trigger already covers 100% of what can merge. Consequences worth knowing: a feature branch gets **no CI until its PR is opened**, and a `push` run on `main`/`development` is the post-merge integration signal — the only check that runs after `gh pr merge --admin`. Never take a merge verdict from `--watch`'s exit status; use `statusCheckRollup` (wired into `/b-close` Step 3.4 and `/b-release` 6.5).

**`main` runs whatever workflows the last release shipped (INFRA-459).** A workflow added,
changed or retired on `development` does not take effect on `main` until a release carries it,
and a branch cut from `main` inherits `main`'s set — so a `hotfix/*` can execute a workflow
already retired on `development`. Read `git show origin/main:.github/workflows/`, never this
worktree. Retiring one also needs an API disable (`gh api -X PUT .../workflows/<id>/disable`):
`state` is API state, invisible to git, and deleting the file does not clear it.

**Multi-agent rule**: each Claude agent runs in its own worktree on its own feature branch. All agents converge on `development` via PRs. This is why `development` exists — it's the convergence point for parallel work streams.

## Release Process (INFRA-145)

1. Tranches land on `development` via `/b-close [WORK_ITEM_ID]` (which PRs to dev, waits for CI, merges via merge-commit).
2. When ready to ship to TestFlight, run `/b-release` from the development worktree:
   - Interactive prompt for bump type (patch / minor / major) — pass as arg to skip.
   - **Before any bump, prompts for the attended crisis device checklist** (`docs/testing/crisis-device-checklist.md`, Phase 2.9, INFRA-591). You need an iPhone on the current iOS. Any FAIL aborts the release. The release PR body records the result, and the merge is bound to the tested tree. **Hotfixes run it too, after the fact** (INFRA-605): their build has already fired by merge time, so the checklist's §5 runs against the TestFlight binary and gates App Store promotion, not TestFlight distribution.
   - Skill auto-generates release notes from squash commits since last semver tag.
   - Bumps version across **FOUR sources** (INFRA-141): `app/package.json`, `app/app.json`, `~/dev/being/.config/env.production`, `~/dev/being/.config/env.development`. Refuses to run if any source disagrees.
   - Opens PR `development → main` (CI runs the same 10 gates — the PR resolves its workflow from the merge commit, so it runs `development`'s `ci.yml`, not `main`'s older copy).
   - Merges via **merge commit** (NOT squash — preserves per-tranche history visible on main).
   - Tags `main` with `vX.Y.Z`, pushes the tag, syncs the bare repo's `refs/heads/main`.
3. **A release is one command.** `--finish` is a recovery re-entry point, not a
   required second step: Phase 6.6 merges the PR itself via `gh pr merge --admin`, so
   nothing is pending between merge and tag. Use it only when the merge landed but
   tagging did not (version mismatch, legacy-tag collision, interrupted run) — and
   never re-run bare `/b-release` in that state, which would bump and PR a second time.

Tag scheme: `vX.Y.Z` semver. Pre-launch: `v0.x.y`. App Store launch: `v1.0.0`. Legacy `v2.x` tags from earlier development phases are filtered out by the b-release `--match 'v[0-9]*.[0-9]*.[0-9]*'` pattern.

## Hotfix Process

For bugs found in production (or TestFlight) that need to ship without waiting on in-progress dev work:

1. Cut a worktree off `origin/main` — there is no standing `main` checkout, and
   `git checkout main` inside the `development` worktree would move it off
   `development`, which the rest of the tooling assumes:
   ```bash
   git -C ~/dev/being fetch origin main
   git -C ~/dev/being worktree add ~/dev/being/hotfix-<slug> -b hotfix/<slug> origin/main
   cd ~/dev/being/hotfix-<slug>
   ```
   Branching off `origin/main` (not a local ref) also satisfies `strict: true`
   by construction. If the fix needs a build or the test suite, create the env
   symlinks by hand — `worktree add` does not, only `/b-work` does:
   `ln -s ../../.config/.env.production app/.env.production` and the same for
   `.env.development`.
2. Fix + commit
3. **Open the PR `hotfix/* → main` immediately** (NOT to development) — draft is fine, don't batch commits first. `hotfix/*` is **not** in `ci.yml`'s `push:` trigger, so a hotfix branch gets no CI until its PR exists; combined with the `--no-verify` allowance below, the PR run can be the only gate a hotfix ever passes. The `opened` event fires it.
4. **Run the crisis device checklist against the TestFlight build** (INFRA-605). Listed here
   because it is a gate, not because it is next: it needs the build, so start step 5 while you
   wait. The merge fires `release.yml` on push to `main` and `--auto-submit` ships the binary
   with no human in the loop, so this is the one release path with no pre-build slot — the
   check runs after the fact, and the build it gates is already on TestFlight.
   - Wait until TestFlight offers the build for **install**. A green `release.yml` means
     uploaded, not accepted.
   - Follow `docs/testing/crisis-device-checklist.md` **§5**, which owns this path: both halves
     in full, the binding lines, the workflows-only `EXEMPT` carve-out, and the FAIL procedure.
   - Post the §6 result block as a **comment on the hotfix PR**, with
     `Trigger: hotfix PR #<N> (INFRA-605)`.
   - **The hotfix build is not promoted to the App Store until that result is PASS or EXEMPT.**
     `WAIVED` is not permitted here — §5 says why. Urgency is not an exception: the fix is
     already live on TestFlight, so the answer is promote later.
5. After merge — tag and backport, without waiting on step 4:
   - Tag main with patch bump (e.g., `v1.0.1`).
   - **Cherry-pick** the hotfix commit onto development — **via a PR, not a direct push**:
     ```bash
     git -C ~/dev/being/development fetch origin
     git -C ~/dev/being/development checkout -b fix/backport-<slug> origin/development
     git -C ~/dev/being/development cherry-pick <hotfix-sha>
     git -C ~/dev/being/development push -u origin fix/backport-<slug>

     gh pr create --base development --head fix/backport-<slug> \
       --title "fix: backport <slug> from main" \
       --body "Cherry-pick of <hotfix-sha>, already shipped on main via PR #<N>."

     # verify per /b-close Step 3.4 — statusCheckRollup, never `gh pr checks --watch` alone
     gh pr merge <PR> --merge --delete-branch --admin
     ```

6. Remove the hotfix worktree once the backport PR has merged **and step 4's result block is on
   the PR**. That ordering is the only enforcement this path has: no skill runs here, so a
   missing comment on an open PR is the sole visible sign the check was skipped.
   `git -C ~/dev/being worktree remove hotfix-<slug>`

**Never `git push origin development`, even as admin** — protection requires a PR (`enforce_admins: true`) and rejects a direct push with `GH006`; backport only through step 5's PR. Why: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § Hotfix backport.

Two details that matter in the same step:
- **Name the `<hotfix-sha>`, never `origin/main`.** If `main` advanced after the hotfix (a release, a second hotfix), `cherry-pick origin/main` picks the wrong commit.
- **Branch off `origin/development`, don't `checkout development`.** It satisfies `strict: true` (required-branches-up-to-date) by construction so the merge won't be refused as BEHIND, and it leaves the `development` worktree on `development`, which `/b-release` and the rest of the tooling assume.

Cherry-pick is preferred over rebase to keep dev's "prevent force-push" protection on. The duplicate commit content is fine — git handles identical content gracefully on the next release PR.

**Workflow-only corrections are hotfix-eligible (INFRA-458).** A diff touching ONLY
`.github/workflows/**` may go `hotfix/* → main` without waiting for a release — it moves no
lockfile so it cherry-picks cleanly, and the PR's own run on `main`'s `ci.yml` validates it.
It may only RESTORE a gate already proven on `development`, never author new CI there, and it
still backports via the cherry-pick PR above. Otherwise a gate added on `development` does not
protect `main` until the next release.

## Workflow Commands

| Command | Purpose |
|---|---|
| `/b-create [TYPE] - [Name]` | Create Notion work item from conversation context with dimension scores |
| `/b-work [WORK_ITEM_ID]` | Fetch work item, create worktree off `development` (with env symlinks per INFRA-141), install deps, then Phase 3 runs two test passes — Pass 1 picks the lane (test-first / test-after / skip; clinical/safety logic forced test-first), Pass 2 identifies tests via the Validation Matrix and writes them — before/around implement |
| `/b-close [WORK_ITEM_ID]` | Push feature branch, open PR to `development`, wait for CI, merge via merge-commit (INFRA-145), update Notion to Done. Phase 2.5 Maestro safety-e2e gate runs scoped flow(s) when safety paths change (INFRA-171). `--push` deprecated (PR merge always pushes). `--skip-e2e` hotfix-only. |
| `/b-release [BUMP] [--finish]` | Promote `development → main` as a release. Interactive bump prompt + FOUR-place version bump (INFRA-141) + env schema pre-flight + auto release notes. Tags + pushes inline; one command start to finish. `--finish` is recovery-only re-entry when the merge landed but tagging did not. |

Branch naming: `feat/*`, `fix/*`, `chore/*` (mapped from work item TYPE). Conventional commits. Aim for <400 LOC per PR.

**Notion work-items DB**: `NOTION_WORK_DB = 277a1108-c208-805c-810b-000b0f0aae22`. Single source of truth — referenced by slash commands as `${NOTION_WORK_DB}`. Rotate here only.

💡 **Recommended mode**: enable Accept Edits (Shift+Tab to cycle) for `/b-work` / `/b-close` / `/b-release` runs. These skills make many sequential tool calls (Notion + git + gh CLI + version bumps). For complex architectural work, consider Plan mode first.

## Docs Map

- `docs/product/` — PRD, TRD, DRD, roadmap, Stoic Mindfulness framework (`stoic-mindfulness/INDEX.md`)
- `docs/architecture/` — system design
- `docs/development/` — dev guides
- `docs/legal/regulatory-applicability.md` — **source of truth for what regulations apply** (FTC, CCPA, TDPSA, GDPR; NOT HIPAA/FDA)
- `docs/legal/breach-notification-runbook.md` — **internal operational procedure** for FTC HBNR (16 CFR Part 318) breach response; founder + counsel only, NOT user-facing (operationalizes the public commitment in `privacy-policy.md` §4.4)
- `docs/legal/dpia-sensitive-wellness-data.md` — **internal DPIA** for sensitive wellness-data processing (TDPSA/CPA/VCDPA/CTDPA); regulator-facing, NOT user-facing
- `docs/security/` — encryption, secure storage
- `docs/testing/` — test strategy
- Source architecture detail: `app/src/README.md`
- Full dev command reference: `QUICKSTART_COMMANDS.md` (at worktree root)

## Known Gotchas

- React must stay at `19.2.3` for RN 0.85.x compatibility — `version-check` script enforces.
- iOS minimum is `16.4` (SDK 56). New Architecture and edge-to-edge are mandatory and cannot be disabled.
- **Android platform config is answered from committed `app/android/`, never from `app.json`.** Only iOS is CNG
  (INFRA-280), so an absent `app.json` android key proves nothing — the generated project is the record and may
  already carry the setting (`edgeToEdgeEnabled=true` lives in `android/gradle.properties` today).
- Vector icons use scoped `@react-native-vector-icons/*` packages (migrated from `@expo/vector-icons` in INFRA-158). On the crisis path, keep `import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons'` eager at module top — do not lazy-import.
- `LSApplicationQueriesSchemes` in `app/app.json` (`tel`, `sms`) is **required** on iOS 13+ for the crisis dial path: without it `Linking.canOpenURL('tel:988')` returns `false` and `CrisisResourcesScreen` falls back to an "Unable to Call" alert during a crisis. Most jest tests mock `canOpenURL`, so they cannot catch this. **The pin is `app/__tests__/safety/lsApplicationQueriesSchemes.config.test.ts`**, run by `npm run precommit` and by the `Safety + privacy gates` CI job (INFRA-368). The CI half is the load-bearing one — a hook is not a control (`--no-verify` is permitted on `hotfix/*`; iOS is CNG, so no plist diff is ever reviewed) — and it gates `main` only once a release carries it: verify with `git show origin/main:.github/workflows/ci.yml | grep -c safety-privacy` (INFRA-458). `app.json` changes do not trigger a Phase 2.5 Maestro run. **No automation verifies the runtime dial**: `crisis-988-dial.yaml` is device-only and unrunnable (DEBUG-589), and the simulator's `canOpenURL` is unconditionally false — a green precommit and a green `npm run e2e:safety` do NOT mean the dial path was verified; only the attended checklist `/b-release` Phase 2.9 runs does. A new crisis-path scheme (e.g. `mailto:`) goes into the array AND the jest test. History: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § LSApplicationQueriesSchemes.
- App Groups entitlement for the iOS widget is injected via a local config plugin at `app/plugins/withAppGroupsEntitlement.js` (was previously `expo-build-properties`'s `ios.entitlements`, removed in SDK 56).
- INFRA-158's SDK 56 opt-outs have both landed (`globalThis.fetch` is `expo/fetch`; TypeScript `6.0.x`). **TS 6**: keep `types: ["node", "react"]` in `tsconfig.json` (without it `NodeJS.Timeout` / `global` fail codebase-wide). `baseUrl` is deprecated and silenced via `ignoreDeprecations: "6.0"`; remove it only in the TS 7 migration, re-validating `@types`/`typeRoots` together. Detail: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § INFRA-158.
- `AsyncStorage` is unencrypted by design; wellness data must use `expo-secure-store` + AES-256.
- Encryption tests are slow (`test:encryption`) — run during pre-push, not pre-commit.
- iOS and Android behavior must match (use `npm run platform:both` to verify).
- Slash commands in `.claude/commands/` must use **absolute paths** (`/Users/max/dev/being/.claude/...`) for any internal file references — never relative `./.claude/...`. This avoids the symlink dance.
- Compliance terminology: "wellness data" not "PHI"; "AES-256 encryption" not "HIPAA-compliant encryption"; "wellness screening" not "clinical assessment."
- Env files live canonically at `~/dev/being/.config/{.env.production,.env.development}` (gitignored at bare root). The leading-dot prefix on the target filenames is **required** since MAINT-190 (2026-05-29): Expo SDK 56's `@expo/metro-config` transform-worker pattern-matches `(^|\/)\.env(\.(local|...))?$` against the *resolved* symlink target, so the canonical files must themselves be named `.env.*`. Without the dot, Metro falls through to its JS parser and throws `SyntaxError: Unexpected token (1:0)` on the `#` comment, breaking every iOS dev build. Worktree `app/.env.{production,development}` are symlinks. `/b-work` creates the symlinks automatically; manual `git worktree add` requires creating them by hand (`ln -s ../../.config/.env.production app/.env.production` and same for development). Dev env has empty `EXPO_PUBLIC_SENTRY_DSN` so Sentry no-ops locally; production env carries the real DSN. Back up the canonical files in 1Password — deleting `.config/` breaks all worktrees.
- **Maestro / simulator / gate rules — full text and history in `/Users/max/dev/being/.claude/docs/e2e-gotchas.md`; read it before running or debugging the gate.** One line each:
  - Safety e2e is local-only (no CI macOS runners); install `brew install mobile-dev-inc/tap/maestro`, never `brew install maestro`. Build with **`npm run e2e:safety:build`** (Release), never `npm run ios` (Debug ships the dev launcher). Budget 21m31s cold / 11–14 min after a native regen (dependency content, lockfile, `app.json`, `plugins/`, `patches/`) / 1–4 min branch switch / ~30 s no-op. Reclaim the DerivedData cache with `npm run e2e:safety:clean`, never by deleting `app/ios/`.
  - Iterate dirty, but **never merge on a dirty-tree build** — `/b-close` Phase 2.5 sets `E2E_REQUIRE_CLEAN_PROVENANCE=1`. Keep notes, drafts and logs OUT of the worktree (session scratchpad or `/tmp`): untracked contents move the provenance hash and read as MISMATCH, costing a rebuild.
  - **Never pipe or chain the build command** (`| tee`, `; echo`) — the last command's status wins and a failed build reads as exit 0. **Never run the suite, a gate build or an ad-hoc `maestro` capture as a reap-able background task** — launch detached in its own session, poll a sentinel, abort with `kill -TERM -- -PGID`. To abort a build, kill the `xcodebuild` PID itself, or it holds the DerivedData lock. A reaped run's `Unknown error`, or a reaped build's `produced no .app`, is the reap, not a regression or a build defect.
  - After `simctl erase`, a red keyboard-up or deeplink flow means unseeded device state before it means the app. Never approve `exp+being`.
  - A flow newly tagged `- safety` must bump the jest tripwire count in `__tests__/scripts/e2e-dynamic-type.test.js` in the same commit. The Maestro version is pinned (`maestro.pinnedVersion`); moving it re-certifies every flow, and `E2E_ALLOW_MAESTRO_VERSION_DRIFT=1` trials a version but is never merge evidence. Keep any new per-flow `e2e:safety:*` script routed through `e2e-safety.sh`.
  - **One device per close — never fan out across simulators to "certify" a viewport.** The smallest-viewport warning is informational; multi-device is a diagnostic on explicit request only.
  - **No device flow runs on any Maestro version (DEBUG-589)**: `e2e-safety.sh` exit 5 on the device path is a toolchain refusal — never a dial-path regression, never a sleeping tunnel. The dial is checked only by the attended device checklist.
  - `E2E_SIM_UDID` pins an exact booted UDID; a pin naming an unbooted device refuses rather than falling back, and the gate reports that refusal as exit 2 (no verdict), never 3.
  - Gate exit codes: 0 pass / 1 flow regression (its only producer) / 2 harness could not complete — no verdict, never a pass and never a regression / 3 target replaced mid-suite / 5 device path refused. A resolver's own return code is never the gate's.
  - **Never identify a process with `pgrep -f` / `pkill -f` in the Maestro tooling (DEBUG-392)** — it matches its own `zsh -c` wrapper. Match the executable with `ps -axo pid=,comm=,args=` and exclude your own process group.
  - **Never replace the installed app while a suite runs**: the gate exits 3 (`REPLACED` / `VANISHED`) and relabels finished flows `VOID`. INFRA-436's lock covers only a peer's `npm run e2e:safety:build`, not `npm run ios`, Xcode Run or `simctl install`. Check for peer builds with `ps -axo`, never `pgrep -f`, before spending one.
  - A manual launch outside `e2e-safety.sh` is unwatched: read `.e2e-provenance.json` from the app container immediately before AND after, or you may be reading a peer's binary.
  - To only observe, diff the installed marker's `head` against your paths before paying a build — an empty diff means a peer's binary already renders it (observation only, never merge evidence).
  - A control pinned below a ScrollView: use `centerElement: true` to force a real scroll (DEBUG-465).
  - `maestro hierarchy` puts iOS label text in `accessibilityText`, not `text` — an all-empty `text` sweep is a parser bug. `accessibilityHint` cannot be asserted on iOS.
  - A jest test driving `e2e-safety.sh` end to end sets `E2E_HOST_SETTLE_MAX_S=0` — but never for the whole `__tests__/scripts` run (it reds `e2e-host-contention.test.js`); run affected suites by name.
- **Verify a bash block extracted from a skill file under `bash -c`, not the tool's `/bin/zsh -c` wrapper** — zsh does not word-split unquoted expansions (`for x in $LIST` yields one blob) and leaves `${PIPESTATUS[0]}` EMPTY, so a failed command reads as a blank pass; capture with `; rc=$?` on an unpiped command. Detail: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § Verifying extracted bash blocks.
- **A back-merge that moves `app/package.json` or the lockfile needs `npm ci` before any
  test run** — not only a `@mp2ez/being-design-system` pin move. A stale tree keeps
  packages the merge DELETED, so tests pass locally against a toolchain CI does not
  install (a jest-preset swap is the quiet case; a design-system pin fails loudly on
  token VALUES, looking like a bad merge rather than a stale install).
- **A back-merge can leave a hand-maintained value wrong while merging CLEAN.** Two branches
  writing the identical `| Version | 2.N |` into a `docs/legal/*.md` header merge without
  conflict — after any merge touching a legal doc, check §1's version against §9's highest row.
  `legalContent.generated.ts` is gitignored and built from those docs, so the same merge leaves
  it stale and reds `safetyPlanClaims.privacy.test.ts` (`npm run generate:legal-content`).
- **`patch-package` reapplies `app/patches/` on every `npm install`** (`postinstall`, INFRA-176) — never hand-edit `node_modules/`; new patches stack with no wiring. The `expo-modules-jsi` patch (`weak let` → `weak var` for Xcode 26's Swift 6.2) goes when an Expo SDK upgrade ships `weak var` natively: then delete the patch file and the postinstall script. Detail: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § patch-package.
- **After a back-merge shifts `app/ios/Podfile.lock` checksums**, `[runtime not ready]: ReferenceError: Property 'MessageQueue' doesn't exist` right after the bundle loads is a stale native binary, not a JS issue. Fix sequence: `cd app/ios && pod deintegrate && pod install`, `rm -rf ~/Library/Developer/Xcode/DerivedData/Being-*`, delete the Being app from the simulator, then `npm run ios`. Metro cache clear alone does not fix it. Detail: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § Podfile.lock.
- **A long-lived worktree's `app/ios/Pods` ages out of sync with `node_modules`, and SDK 56 makes that a
  launch crash.** Expo modules ship as *prebuilt* xcframeworks, so `Pods/ExpoModulesCore.xcframework` is a
  build INPUT — no DerivedData clear can fix it. Symptom: `dyld: Symbol not found … ExpoModulesJSI`.
  Fix is `expo prebuild --clean --platform ios` (`--platform ios` is required: `app/android/` is committed).
- **Trust a Jest error's literal text before any environmental hypothesis (INFRA-180).** `Exceeded timeout of 30000,30000 ms` was a `--testTimeout` passed twice, which yargs made an array and jest coerced to `NaN` → a 0 ms timeout. Reproduce with the EXACT CI invocation, `--` separator included; a character-for-character match means the command is the variable, not the environment. Audit each quarantined file on its own before choosing a fix shape — about half of MAINT-188's were redundant or aspirational, not salvageable. History: `/Users/max/dev/being/development/docs/development/test-fake-timer-ci-flake.md` (per worktree) and `/Users/max/dev/being/.claude/docs/gotcha-history.md` § Yargs.
- **Source-string test assertions must strip comments before matching (DEBUG-390)** — this codebase deliberately names anti-patterns in prose, so a bare `not.toContain('x')` fails on correct code; never fix it by rewording the comment. Strip block and line comments, match prop-shaped patterns (`/foo\s*[=:]/`), pair it with an assertion that fires against the SLICE itself (never a literal), and anchor the slice to a semantic boundary, never a byte count. Rationale: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § Source-string.
- **A feature barrel (`index.ts`) re-export puts unrouted code in every importer's eager module graph, safety paths included (FEAT-376)** — check the barrel's consumers before concluding new code is off a safety path or that Phase 2.5 cannot exercise it; jest does not stand in (no Metro). Detail: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § Feature barrels.
- **An Expo config plugin registered as a bare string takes its library defaults, which can add permissions.** On a permission option `false` DELETES the Info.plist key rather than skipping it, so a later plugin can strip an earlier one's disclosure — omit to inherit. `app/ios/` is CNG, so none of it shows in a diff: regenerate, read the plist, pin it.
- **`app/` has two test roots (INFRA-84)** — `app/src/**/__tests__/` and `app/__tests__/`, which npm scripts glob by name — so a "no callers" finding from `app/src` alone is unverified: grep both roots, plus `supabase/functions`. Detail: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § Two test roots.
- **A Notion comment over ~4,000 RENDERED characters (~3,500 plain) is truncated mid-sentence, silently** — treat one ending mid-clause as truncated. Long findings go in the page body (uncapped) with a short pointer comment. Backtick filenames: a bare `CLAUDE.md` gets auto-linkified. Detail: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § Notion.
- **Proving a migration landed before an observed event**: `schema_migrations` is `(version, statements, name)` only and `track_commit_timestamp` is off, so no application timestamp exists. Compare `xmin::text::bigint` on the changed `pg_proc`/`pg_class` row against the observed row's — transaction ids are monotonic, so ordering is provable from data.
- **A new `Deno.env.get` in `supabase/functions/` needs a `deploy-manifest.json` entry in the SAME commit (INFRA-442).** `scripts/supabase-deploy-drift.js --reconcile` (CI `Security + compliance`) fails both ways — undeclared read, and declared-but-unread (`SECRET STALE`) — so a secret cannot be pre-declared ahead of its reader. It walks `_shared/` too, where nothing reads env at all: config arrives as a parameter.
- **An empty result from a filtered test run is not a pass.** Bash working directory
  persists between calls, so a `cd` earlier in a session leaves `npm run test:*`
  executing outside `app/`, where npm exits ENOENT and prints nothing a
  `grep -E "Tests:|FAIL"` would match. Assert the `Tests: N passed` line is PRESENT;
  never infer a pass from absent failures. Same family as the "never pipe the build
  command" rule — both turn a command that never ran into a green reading.
- **Stopping a backgrounded `npm run test:*` leaves its jest child running.** The wrapper
  dies, jest does not, so a re-run puts two suites on one tree — they contend, and an edit
  made "between" runs lands mid-flight in the survivor. Reap the jest PID itself, matched on
  YOUR worktree path; `pkill -f jest` and `grep -c jest` also hit other repos' stale workers.
- **Under `CI=true`, type-aware ESLint lints the file ON DISK, not the text you pass.**
  typescript-estree infers a single CLI run from `CI=true` and builds its program from
  disk, so `ESLint#lintText` silently lints the real file. A jest probe that lints via
  `lintText` needs `parserOptions.disallowAutomaticSingleRunInference: true`, and must
  assert a message is PRESENT, or it passes vacuously in CI.
- **A new `app/scripts/*` file needs `git add` before the npm script naming it will pass
  (DEBUG-389).** `check-workflow-scripts.js` resolves every `npm run` target against the git
  INDEX, not the working tree, so an unstaged new script fails `test:scripts` as an
  unrelated-looking red. Stage the file with the package.json edit.

## Git Hooks (INFRA-155)

Husky v9 wires two hooks. **pre-commit** (INFRA-156) runs `npm run precommit` → `typecheck && lint:baseline && test:safety && test:clinical && test:unit && test:privacy`; fires on every `git commit`. This entry used to list four scripts and "~16s", omitting `test:safety` and `test:privacy` — the real chain is six and `test:safety` alone measures ~15s warm / ~58s cold, so budget well past a minute. That understatement mattered: the argument below for keeping CI-class checks off the hook is precisely that slow hooks train `--no-verify`, and the hook was already heavier than the doc claimed. **pre-push** (INFRA-155) runs `npm run prepush` → `check:crisis-hotline` (~1s); fires on every `git push`. Heavy CI-class checks (test:ci, full clinical-complete) run on CI, not locally — running them on every push would train `--no-verify`. **Bypass policy**: `--no-verify` (commit or push) permitted *only on `hotfix/*` branches*. For `feat/*`, `fix/*`, `chore/*` — never. Full rationale: `docs/development/git-hooks.md`.

## Convention Reminders

- TDD for: bug fixes, pure logic, stateful algorithms, complex edge cases. Test-after for: API integrations, UI, glue code.
- When making multi-file or architectural changes: outline approach, get approval, then build.
- Push back with reasoning when something is wrong; no performative agreement.
