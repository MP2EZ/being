# Urgent Production Fix — Triage and Path

> **Being has no emergency fast-path deploy workflow, deliberately.**
>
> Three workflows from the same 2025-09-27 batch used to sit in `.github/workflows/`:
> `emergency-deploy.yml` and `emergency-deploy-optimized.yml` (deleted by DEBUG-374),
> and `artifact-cache-manager.yml`, the cache warmer that existed to make their
> advertised speed achievable (deleted by DEBUG-389). The reason is not that
> they were unfinished — it is that **the capability they advertised cannot exist**:
> Being ships through the App Store, where TestFlight processing and review dominate
> end-to-end time-to-user by an order of magnitude. A 4.5-minute CI job cannot make a
> fix reach a phone faster. The 988-outage scenario this document used to name is not
> addressable by faster CI at all.
>
> What follows is the part that was worth keeping: **when** something is urgent enough
> to jump the queue, and **what to actually run**.

## When to jump the queue

Two severity levels. Both route to the same mechanism (below) — the level governs how
much you skip and how fast you move, not which workflow you invoke.

### Level 1 — Safety-critical

- Crisis button response time > 3 seconds
- 988 dial path failing (see the `LSApplicationQueriesSchemes` gotcha in `CLAUDE.md`)
- PHQ-9 / GAD-7 scoring errors affecting threshold detection
- Security incident affecting wellness data
- Mass crashes during crisis usage

### Level 2 — Total failure

- Complete app failure during active crisis interventions
- 988 dial path completely unavailable
- Data breach exposing wellness data — this additionally triggers
  `docs/legal/breach-notification-runbook.md` (FTC HBNR, 16 CFR Part 318)
- Regulatory requirement demanding an immediate change

Anything that is not on these lists is a normal fix. Branch off `development`, PR it,
let it ride the next `/b-release`.

## What to actually run

The real path is the **Hotfix Process** in `CLAUDE.md`. It is the only path that ships
to `main` without waiting on in-progress dev work.

```bash
git checkout main && git pull
git checkout -b hotfix/<short-description>
# fix + commit

# Open the PR to main IMMEDIATELY — draft is fine, do not batch commits first.
# hotfix/* is NOT in ci.yml's push: trigger, so a hotfix branch gets NO CI until
# its PR exists. The `opened` event is what fires it, and that PR run can be the
# only gate a hotfix ever passes.
gh pr create --base main --head hotfix/<short-description> --title "..." --draft
```

After merge to `main`, `release.yml` fires on push and runs
`eas build --profile production --auto-submit`. Expect **~20–30 minutes** to
TestFlight, asynchronously — that is the floor, and no CI change moves it.

Then tag `main` with a patch bump and **cherry-pick the hotfix commit onto
`development` via a PR** — not a direct push; `development` protection rejects
direct pushes with `GH006` even for admins. Full procedure, including the two
details that are easy to get wrong (name the SHA, not `origin/main`; branch off
`origin/development`, not `development`), is in `CLAUDE.md` → Hotfix Process.

### Bypasses

`--no-verify` (commit/push) and `/b-close --skip-e2e` are permitted on **`hotfix/*`
only** — never on `feat/*`, `fix/*`, or `chore/*`. That is the whole bypass surface;
there is no separate emergency authorization, override flag, or approval matrix.

## Precondition: `main` must be able to pass CI (INFRA-452)

**Check this before you need it, not while you need it.**

`main` can be unmergeable through no fault of your diff. Audit remediations —
allowlist entries in `app/.audit-ci.json`, `overrides` in `app/package.json` — land on
`development` and reach `main` only through a release. Between releases `main`'s
dependency posture is frozen while the advisory database keeps moving, so `main` drifts
red on its own, with no commit and no PR. Verified 2026-08-15: a hotfix branch touching
only `supabase/functions/` and no dependency failed `Security + compliance` on three
advisories, while the same command exited 0 on a freshly-synced `development`.

`.github/workflows/main-branch-health.yml` now probes this daily and files an issue
under the `main-branch-health` label. To check on demand:

```bash
gh workflow run main-branch-health.yml     # then read the run, or the open issue
```

### Which remediations are hotfix-eligible

Not all of them, and the distinction is the lockfile:

| Change | Hotfix-eligible? | Why |
|---|---|---|
| `app/.audit-ci.json` allowlist entries | **Yes** | Allowlist-only. Touches no dependency resolution; the lockfile stays byte-identical, so it cherry-picks onto `main` cleanly. |
| `app/package.json` `overrides` / `resolutions` | **No** | Requires regenerating `main`'s `package-lock.json`. `main` is hundreds of commits divergent, so cherry-picking `development`'s lockfile drags the entire dependency delta — that *is* a release. |

If an override-based remediation genuinely cannot wait: branch off `main`, edit the
overrides, run `npm install` to regenerate **`main`'s own** lockfile in place, then
verify `npx patch-package` still resolves `expo-modules-jsi@56.0.7`. That is real work
under time pressure, which is itself the argument for releasing promptly rather than
relying on the escape hatch.

**Never run a blanket `npm audit fix`.** It bumps past the `expo-modules-jsi@56.0.7`
pin and breaks `npm ci` for everyone (see `CLAUDE.md` → npm-audit gate).

### What a green probe does not prove

The probe covers the audit gate only. Nine of `ci.yml`'s ten gates are pure functions of
the tree and cannot change verdict without a commit; the audit gate is the only one that
also depends on a time-varying external database, which is why it is the one that drifts
between releases.

But a `pull_request` resolves its workflow from the **merge commit**, so a hotfix PR runs
**`main`'s** `ci.yml` — which is separately stale. Tracked as INFRA-458 (`main` has no
`Safety + privacy gates` job) and INFRA-459 (`main` still carries retired workflows).
Until those close, a green probe means "the audit gate will pass," not "the PR will pass."

## Caveat worth knowing

The Hotfix Process is documented but, as of this writing, **has never been executed** —
no `hotfix/*` branch has ever been cut. Every commit on `development` has arrived via a
normal PR merge. Treat the first real hotfix as partly a test of the procedure, and fix
the procedure if it fights you.

## What was removed, and why

DEBUG-374 deleted both emergency workflows rather than repairing or parking them.
Recorded here so the decision is not silently reversed:

- **Never run once.** Authored 2025-09-27; zero runs on either, in ~10 months.
- **Five of six `npm run` targets did not exist** (`deploy:emergency-cloud`,
  `emergency:rollback`, `health:emergency-check`, `monitor:emergency-deployment`,
  `test:crisis`). Only `test:crisis-quick` existed.
- **`eas submit --profile production-emergency` had no submit profile.** `eas.json`
  defines `production-emergency` as a *build* profile only, so even a fully repaired
  workflow failed at submission.
- **The crisis gate gated nothing.** `emergency-build` declared
  `needs: [emergency-authorization]` and did *not* depend on `minimal-crisis-validation`,
  so build and deploy ran in parallel with the safety check regardless of its outcome —
  while the audit report printed that validation had been performed.
- **`repository_dispatch` could only ever fail.** The first gate read
  `github.event.inputs.crisis_override`, which is null on a dispatch event, so the job
  exited 1. No sender existed anywhere in the repo for either event type.
- **Unrepairable in practice.** Proving a repair required actually running them, and a
  single dispatch executes `eas build --profile production-emergency` as a real *cloud*
  build against a `distribution: store` profile, matrixed over iOS and Android, with no
  dry-run seam. "Exercise it once" and "do not ship an untested emergency path" could
  not both be satisfied.

The `.disabled` parking convention (INFRA-337, MAINT-369) was not used because parking
is for a workflow held against a genuine unmet precondition — as `deploy.yml.disabled`
is. These had no pending precondition; they were simply wrong.

### `artifact-cache-manager.yml` (DEBUG-389)

Deleted for the same reason one level down: it was the cache warmer whose entire
purpose was to make the "4.5-minute emergency deployment" figure above achievable, and
that figure was already ruled unreachable. Its state was also invisible to git — the
Actions API reported it `disabled_manually`, a bit that lives only in the GitHub UI, is
one click from being reverted, and cannot be seen by anyone reading the repo. Meanwhile
the file declared `push: [main, release/*, hotfix/*]` **and** a weekly `schedule`, so it
read as *more* automatic than the dispatch-only pair DEBUG-374 removed.

Evidence, recorded here because it is perishable — `gh run view --log-failed` already
returns HTTP 410 for every one of these runs:

- **9 runs on record, 9 failures.** One `push` run 2025-10-01, then eight scheduled runs
  2025-10-05 through 2025-11-23. It never completed successfully, once.
- **The two missing scripts were not why it failed.** `npm run test:crisis` (`:304`) and
  `npm run perf:crisis` (`:306`) sat in `crisis-validation-cache`, which declared
  `needs: [cache-analysis, validated-dependencies-cache]`. The upstream job failed every
  run, so that job was *skipped* every run and those two lines never executed. The real
  break is upstream: `:251` runs raw `npm audit --audit-level=moderate`, which MAINT-182
  replaced repo-wide with `npx audit-ci --config .audit-ci.json` precisely because the
  repo carries allowlisted advisories. Repairing the script names would have changed
  nothing observable — which is the trap this whole class sets.
- **Zero consumers.** `grep -rn download-artifact .github/` returns nothing repo-wide, so
  all three of its uploads (`emergency-build-metadata-{ios,android}`,
  `crisis-validation-certificate`, `cache-management-report`) were read by nobody. Its
  `emergency-build-*` and `crisis-validated-*` cache keys had no restorer anywhere; the
  only one that ever existed was in `emergency-deploy-optimized.yml`, deleted by
  DEBUG-374. (`deploy.yml.disabled` contains the string `crisis-validated`, but as a job
  *output* name, not the cache key — a false positive worth knowing about.)
- **The caching premise was void regardless.** `eas build` executes in EAS cloud and
  writes no local artifact; `app/dist/` is gitignored and was never produced by that job;
  and both build-artifact keys embed `${{ github.sha }}`, so a weekly pre-build could
  never be restored by a later hotfix commit even if a consumer had existed.

Note that `origin/main` still carries this file *and* its deleted consumer until the next
release — the deletion lands on `development` first, like everything else.

`app/eas.json`'s `production-emergency` build profile was deliberately **not** removed as
cleanup: `app/__tests__/safety/e2eSeedGate.config.test.ts` enumerates it, so deleting it
reddens a safety gate. It is now workflow-orphaned, which is worth its own item.

### The guard that ends this class

Three work items on "a workflow invokes an npm script that does not exist" — MAINT-369,
DEBUG-374, DEBUG-389 — is enough. `app/scripts/check-workflow-scripts.js` now asserts
every `npm run` target in a loadable workflow resolves, following alias chains, and runs
in CI's `Safety + privacy gates` job.

It scans `*.yml`/`*.yaml` only. That is not an allowlist and needs no maintenance: it is
the same predicate GitHub Actions uses to decide what to load, so the scanned set is
defined by what can actually execute. `deploy.yml.disabled`'s 10 knowingly-missing
targets are excluded by construction — and renaming it back to `.yml` turns MAINT-369's
advisory header into an immediate red build.

---

**See also:** `CLAUDE.md` → Hotfix Process · `docs/development/github-flow.md` →
release automation · `docs/development/post-launch-monitoring-runbook.md` → what
actually pages you · `docs/legal/breach-notification-runbook.md` → FTC HBNR procedure
