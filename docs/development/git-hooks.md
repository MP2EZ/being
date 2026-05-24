# Git Hooks (Husky)

Wired in INFRA-155. Husky v9 sits in `app/devDependencies` and bootstraps on every `npm install` via the `prepare` lifecycle script.

## What fires when

| Hook | npm chain | Fires on |
|---|---|---|
| `pre-push` (`app/.husky/pre-push`) | `npm run prepush` → `check:crisis-hotline && test:ci && validate:clinical-complete` | every `git push` |
| `pre-commit` | *(not wired)* | — |

The pre-commit hook is intentionally absent. The `precommit` npm chain references `lint:clinical`, which expects `.eslintrc.clinical.js` — a config file that doesn't exist anywhere in the repo (pre-existing bit-rot, surfaced by INFRA-155's wiring work). Wiring the hook today would block every commit on a useless ENOENT error. A separate ticket will restore the missing config and wire the pre-commit hook.

## Bypass policy

`git push --no-verify` is permitted **only on `hotfix/*` branches**.

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

`CI=true` (set automatically by GitHub Actions) causes husky to skip installation entirely. The same `prepush` chain runs as the 9-gate CI workflow, so the safety check runs there too — just by a different trigger.
