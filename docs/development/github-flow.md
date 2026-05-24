# GitHub Flow Workflow (INFRA-145)

This document describes the branching, release, and hotfix workflow for the Being app, established by INFRA-145 in May 2026. It complements the terse summary in `.claude/CLAUDE.md` with longer-form rationale and edge-case guidance.

## Why GitHub Flow

The Being project moved from "every tranche PRs directly to main" to GitHub Flow because:

1. **Multi-agent parallel work**: solo founder regularly runs multiple Claude agents in parallel, each in its own worktree. Each agent's work needs a convergence point that isn't the live production branch.
2. **Imminent TestFlight launch**: once `main` becomes a build trigger, "every tranche merged = new TestFlight build" wastes build numbers and removes soak time that catches bugs.
3. **Soak time**: tranches landing on `development` get exercised by subsequent tranches and CI runs before promoting to main. Bugs that would have been "in production for a day" become "caught on dev within hours."

GitHub Flow keeps things simple — no `release/*` branches, no Git Flow ceremony — while providing one critical safety boundary (`main` is updated deliberately, not continuously).

## Branch model

### Long-lived branches

| Branch | Role |
|---|---|
| `main` | Last-shipped state. Updated only via `development → main` release PRs (`/b-release`) or `hotfix/* → main` PRs. TestFlight + App Store build from this branch. |
| `development` | Integration branch. All feature/chore/fix branches PR into this. Each merge is "ready to release." |

### Short-lived branches

| Pattern | Branched from | PR target | Created by |
|---|---|---|---|
| `feat/*` | `development` | `development` | `/b-work` (FEAT type work item) |
| `fix/*` | `development` | `development` | `/b-work` (DEBUG type work item) |
| `chore/*` | `development` | `development` | `/b-work` (INFRA/MAINT/AGENT type work item) |
| `hotfix/*` | `main` | `main` | Manual (see Hotfix Process below) |

### Branch protection

Both `main` and `development` enforce:
- Require `CI pass` status check (the 9-gate aggregator; strict — must be up-to-date with base)
- Enforce admins (no bypass)
- Prevent force-push (no rewriting history)
- Prevent deletion (long-lived branches stay)
- Require PR (no direct push; everything goes through `gh pr create`)

For solo workflow speed, use `gh pr merge --merge --admin` to bypass the "branch up-to-date" requirement when CI has already passed.

## Daily workflow

```
/b-create FEAT - Add foo to bar         # Creates Notion work item (FEAT-N)
/b-work FEAT-N                          # Worktree + branch off dev + implement
# ... agent edits, runs tests ...
/b-close FEAT-N                         # PR to dev → CI → merge (merge-commit)
```

### What `/b-work` does

1. Fetches the Notion work item by ID
2. Creates a new worktree at `~/dev/being/<short-name>/` on branch `feat/FEAT-N-slug` (or `fix/` / `chore/` based on type) off latest `development`
3. **Sets up env symlinks** (`app/.env.production` → `~/dev/being/.config/env.production`, same for development). This is load-bearing per INFRA-141 — the Zod schema fails app boot if any env var is missing.
4. Runs `npm install` if `node_modules` is missing
5. Updates Notion status → In Progress
6. Optionally invokes specialist agents (crisis / compliance / philosopher) for safety scan on Protected Paths
7. Implements per acceptance criteria

### What `/b-close` does (post-INFRA-145)

1. Validates branch alignment with work item
2. Commits any pending changes
3. **Pushes feature branch** to origin
4. **Opens PR** targeting `development` with body derived from work item
5. **Waits for CI** (9 strict gates)
6. **Merges via `gh pr merge --merge --admin`** — uses merge commit (NOT squash) to preserve feature branch history visible in dev
7. **Syncs bare-repo + development worktree**: `git update-ref refs/heads/development <merge-sha>` + `git pull --rebase` in development worktree
8. Updates Notion status → Done
9. Optionally removes the feature worktree

The deprecated `--push` flag is accepted as a no-op (the PR merge always pushes).

## Release process

Releases happen when one or more tranches have accumulated on `development` and you're ready to promote to `main` (which is the build source for TestFlight + App Store).

### How to release

```bash
cd ~/dev/being/development
/b-release                              # Interactive bump prompt
# Or:
/b-release patch                        # Patch bump (1.0.0 → 1.0.1)
/b-release minor                        # Minor bump (1.0.0 → 1.1.0)
/b-release major                        # Major bump (1.0.0 → 2.0.0)
```

The skill:
1. Pre-flights: clean working tree, in sync with origin, dev not behind main, latest dev commit has passing CI, **INFRA-141 env schema parses successfully**.
2. Reads version from FOUR sources (see "Version sources" below). Aborts on drift.
3. Computes next version per bump type.
4. Updates ALL FOUR sources atomically.
5. Re-validates env schema.
6. Auto-generates release notes from squash commits since last semver tag (grouped by conventional commit prefix).
7. Commits the version bump on development.
8. Opens PR `development → main` with the release notes as body.
9. Waits for CI on the release PR.
10. Merges via `gh pr merge --merge --admin` — **merge commit** strategy preserves per-tranche history on main.

After GitHub merges:

```bash
/b-release --finish
```

This tags `vX.Y.Z` on origin/main, pushes the tag, and syncs the bare-repo's local refs.

### Version sources (FOUR places per INFRA-141)

Pre-INFRA-141 the version lived in two places. Post-INFRA-141 it's in four:

| Source | Field | Type |
|---|---|---|
| `app/package.json` | `version` | npm semver string |
| `app/app.json` | `expo.version`, `expo.ios.buildNumber`, `expo.android.versionCode` | Expo manifest (mixed string/int) |
| `~/dev/being/.config/env.production` | `EXPO_PUBLIC_APP_VERSION`, `EXPO_PUBLIC_BUILD_NUMBER` | Strings (Zod requires non-empty strings, no coercion) |
| `~/dev/being/.config/env.development` | Same two vars | Strings |

All four must agree at any given moment. `/b-release` enforces this with a hard abort on drift. The env files are NOT git-tracked (they live in `~/dev/being/.config/` and are symlinked into each worktree's `app/.env.*`), so editing them affects every worktree's resolved env at once.

### Tag scheme

- Strict semver `vX.Y.Z` only (e.g., `v1.0.0`, `v1.0.1`)
- No pre-release tags (`v1.0.0-rc.1` etc.) until a use case appears
- Pre-launch versions: `v0.x.y` if you want; current line is `v1.x.y` (carryover from earlier dev phases)
- App Store launch: `v1.0.0` semantically — though the current package.json is already at 1.0.0, so first ship may be `v1.0.1`

### Legacy tags

The repo has four pre-existing tags from earlier development phases:
- `v1.0.0-alpha` (pre-release)
- `v1.8-production-ready` (non-semver)
- `v2.0.0` (orphaned — points at abandoned commit, but published to origin)
- `v2.0.0-p0-cloud` (pre-release marker)

`/b-release` filters these out via `git describe --match 'v[0-9]*.[0-9]*.[0-9]*' --exclude '*-*'`. The strict-semver pattern excludes pre-release suffixes and non-semver shapes.

**v2.0.0 collision warning**: if a user runs `/b-release major` from current v1.0.0, the computed next version `v2.0.0` would collide with the orphaned legacy tag. The Phase 7.3 pre-check in `/b-release` catches this and aborts with resolution paths (delete legacy tag, skip to v3.0.0, or force-update).

## Hotfix process

For bugs in production (or TestFlight) that need to ship without waiting on in-progress dev work:

```bash
cd ~/dev/being/main
git checkout main && git pull
git checkout -b hotfix/short-description
# ... fix + commit ...
git push -u origin hotfix/short-description
gh pr create --base main --head hotfix/short-description --title "..." --body "..."
# CI runs against main, merge when green
```

After the hotfix merges to main:

1. Tag main with patch bump (e.g., `v1.0.1`)
2. **Cherry-pick** the hotfix onto development:
   ```bash
   cd ~/dev/being/development
   git fetch origin
   git checkout development
   git cherry-pick origin/main
   # (or specifically pick the hotfix SHA if main has multiple new commits)
   git push origin development
   ```

### Why cherry-pick, not rebase?

Rebase would require force-pushing development to absorb the hotfix's history rewrite. We deliberately disabled force-push on development to prevent accidental history loss. Cherry-pick creates a duplicate commit (same content, different SHA), which git handles gracefully on the next dev → main release PR (the merge sees no new changes to apply).

## Multi-agent worktree pattern

When running multiple Claude agents in parallel:
- Each agent gets its own worktree at `~/dev/being/<agent-or-branch-name>/`
- Each agent's worktree is on a feature branch off latest `development`
- Each agent PRs to `development` independently
- CI runs on each PR independently
- Conflicts are resolved at PR-merge time on dev (not on main)

This is the primary reason `development` exists. With a single solo developer, `development` could be 1:1 with main most of the time — but with parallel agents, it's the convergence point that prevents two agents from racing into main.

### Env symlinks are load-bearing

Each new worktree needs `app/.env.production` and `app/.env.development` symlinked to `~/dev/being/.config/env.{production,development}` BEFORE anything imports `@/core/config/env`. The INFRA-141 Zod schema fails app boot if any required env var is missing.

`/b-work` handles symlink creation automatically. Manual `git worktree add` requires creating them by hand:

```bash
ln -s ../../.config/env.production app/.env.production
ln -s ../../.config/env.development app/.env.development
```

## Skill cheat sheet

| Command | Purpose | Typical duration |
|---|---|---|
| `/b-create [TYPE] - [Name]` | Create Notion work item with dimension scores | 30 sec |
| `/b-work [WORK_ITEM_ID]` | Worktree + branch + implement | varies (minutes to hours) |
| `/b-close [WORK_ITEM_ID]` | PR to dev → CI → merge → sync | 3-5 min (CI wait) |
| `/b-release [BUMP]` | Promote dev → main as release | 5-8 min (CI wait) |
| `/b-release --finish` | Post-merge tag + push + sync | 10 sec |

## Recommended Claude Code mode

For the multi-step skills (`/b-work`, `/b-close`, `/b-release`), enable **Accept Edits** mode (Shift+Tab to cycle) for the smoothest flow. Each skill makes 10-30+ tool calls (Notion + git + gh CLI); manually approving each one adds significant friction.

For architectural / Protected Path work (anything in `app/src/features/crisis/`, `app/src/features/assessment/`, or `app/src/core/services/security/`), consider **Plan mode** first. The skill does research + proposes an approach, you approve, then it executes. This is the right mode for new feature design, refactors, or anything where the implementation approach isn't pre-decided.

## Reversibility

If GitHub Flow turns out to be too much ceremony, the migration is reversible:
1. Switch `/b-close` back to targeting `main` (revert the Phase 3 PR-based merge to local merge)
2. Retire `/b-release` (or keep it dormant)
3. Remove development's branch protection rules (keep main's)

The branch protection on development adds value either way — it prevents accidental direct pushes that bypass CI.

---

*INFRA-145 — established 2026-05-24. See also: [.claude/CLAUDE.md](../../.claude/CLAUDE.md) Branch Model section, [Plan file](https://www.notion.so/36aa1108c20881288b62c976bb20866a) (INFRA-145 in Notion).*
