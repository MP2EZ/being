# Urgent Production Fix — Triage and Path

> **Being has no emergency fast-path deploy workflow, deliberately.**
>
> Two crisis-labelled workflows (`emergency-deploy.yml`, `emergency-deploy-optimized.yml`)
> used to sit in `.github/workflows/`. DEBUG-374 deleted them. The reason is not that
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

---

**See also:** `CLAUDE.md` → Hotfix Process · `docs/development/github-flow.md` →
release automation · `docs/development/post-launch-monitoring-runbook.md` → what
actually pages you · `docs/legal/breach-notification-runbook.md` → FTC HBNR procedure
