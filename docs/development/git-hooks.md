# Git Hooks (Husky)

Wired in INFRA-155 (pre-push) and INFRA-156 (pre-commit). Husky v9 sits in `app/devDependencies` and bootstraps on every `npm install` via the `prepare` lifecycle script.

## What fires when

| Hook | npm chain | Fires on |
|---|---|---|
| `pre-commit` (`app/.husky/pre-commit`) | `npm run precommit` → `typecheck && lint:baseline && test:clinical && test:unit` (~16 sec) | every `git commit` |
| `pre-push` (`app/.husky/pre-push`) | `npm run prepush` → `check:crisis-hotline` (~1 sec) | every `git push` |

### Why pre-push runs only `check:crisis-hotline`

The `prepush` chain originally also ran `test:ci && validate:clinical-complete`. Real-world testing during INFRA-155 showed that chain takes 20+ minutes locally (vs. ~40 seconds on GitHub Actions). A 20-minute interactive `git push` hook trains exactly one habit — `--no-verify` every time — which is strictly worse than no hook. Worse still, the same checks already run on every PR via the 9-gate CI workflow, so the local invocation was duplicative.

The hook now runs only the **fast, local, non-redundant** check: the 988 env-regression guard (`check:crisis-hotline`), ~1 second. CI handles the heavy validation. If you want to run the full local validation on demand, invoke the underlying npm scripts directly: `npm run test:ci`, `npm run validate:clinical-complete`.

### Pre-commit chain notes

The original `precommit` chain referenced a stale `lint:clinical` script which pointed at a non-existent `.eslintrc.clinical.js`. INFRA-156 investigation revealed the clinical-strict rules had already been merged into the unified `app/eslint.config.js:74-107` during Phase 7A consolidation — the script reference was the only leftover. The fix was a one-line swap (`lint:clinical` → `lint:baseline`).

The full chain measures ~16 sec end-to-end on this codebase: typecheck (3.5s, incremental) + lint:baseline (3.5s, ratchet over 860 baseline errors) + test:clinical + test:unit (~9s combined). Fast enough that the pre-commit hook is non-annoying for typical commit cadence. If the chain ever balloons past ~30s during normal codebase growth, revisit (same INFRA-155 rightsize playbook).

## Bypass policy

Both `git commit --no-verify` and `git push --no-verify` are permitted **only on `hotfix/*` branches**.

For everything else — `feat/*`, `fix/*`, `chore/*` — `--no-verify` is banned. If a gate is wrong, fix the gate; don't bypass it.

Rationale: the `prepush` chain includes the 988 crisis-hotline env-regression check (MAINT-154). A silently-shipped wrong-hotline value is a worst-case safety failure for the app's most critical user-facing affordance. The hook exists specifically to prevent the kind of "I just need to push this real quick" regression that bypassing trains.

`hotfix/*` carves out a narrow exception because by definition a hotfix is responding to an in-production failure where waiting on a 5-min CI chain may itself be the problem. The exception is *narrow* — the branch prefix encodes the intent and makes after-the-fact audit easy.

## Worktree layout (why `cd .. && husky app/.husky`)

The repo is a **bare repo + worktrees**: `package.json` lives at `app/package.json` (one level below the worktree root), and `.git/` is per-worktree pointer files into the bare repo at `~/dev/being/.git/`.

Standard husky expects `package.json` at the same level as `.git/`. Two adjustments make it work here:

1. **`prepare` script** uses `cd .. && husky app/.husky` rather than the default `husky`. The `cd ..` puts husky in the worktree root (where git is reachable); the `app/.husky` argument tells it where to write shim files.
2. **Hook contents** start with `cd app && ...` because git fires hooks with `pwd = worktree root`, but `npm run <script>` needs `pwd = app/` to find `package.json`.

`core.hooksPath = app/.husky/_` is written to the **bare repo's shared config**, so every worktree (existing + future) picks up the hooks without per-worktree setup. Verified working from `infra-155/` during INFRA-155 implementation.

## Known husky weakness

Husky depends on the `prepare` npm lifecycle, which only runs after `npm install`. A teammate (or future-you on a new laptop) who clones fresh and skips install has no hooks until they install. This is universal husky, nothing specific to this setup. CLAUDE.md's setup steps should make `npm install` a hard requirement immediately after clone.

## CI

`CI=true` (set automatically by GitHub Actions) causes husky to skip installation entirely. The 9-gate CI workflow runs the full validation (typecheck, lint, test:ci, clinical, edge functions, etc.) on every PR, so the heavy checks are still enforced — just at PR time rather than local push time. The local pre-push hook covers the fast 988 check that benefits from catching regressions before they leave the developer's machine.
