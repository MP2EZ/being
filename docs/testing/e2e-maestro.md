# Safety-path e2e with Maestro (INFRA-171)

## Why Maestro

Being is a wellness app touching at-risk users. Five user-visible safety contracts ship in every build:

1. PHQ-9 Q9 > 0 fires exactly one canonical alert with three buttons.
2. PHQ-9 score ≥20 completion shows a crisis-tier results banner.
3. GAD-7 score ≥15 completion shows a crisis-tier results banner.
4. Crisis button reaches `CrisisResources` from each tab (Home/Learn/Insights/Profile).
5. 988 dial does not surface the "Unable to Call" fallback alert (pins `LSApplicationQueriesSchemes`).

Every Jest test in the suite mocks `Alert.alert` and `Linking.canOpenURL`. That's correct for Jest's job (fast logic verification), but it means these five user-visible contracts are invisible to the rest of the test stack. The MAINT-166 PR 1 double-Alert regression existed because nothing mechanically pinned them — the bug only surfaced because a code-review docstring (`⚠️`) flagged it.

Maestro fills that gap. It runs against a real iOS sim, where `LSApplicationQueriesSchemes` actually matters, real alerts actually appear, and the safety surface is observable end-to-end. YAML flows are cheap to author, `maestro studio` is a usable debugging tool, and the local-only execution model keeps macOS CI runner costs out of scope for a solo-founder project.

Detox was previously in the repo (`MAINT-119`) with one real test and zero commits since — never CI-integrated, never doc-referenced beyond a tagline. INFRA-171 replaces it.

## What this is NOT

- Not a CI gate. Local-only. The `/b-close` Phase 2.5 gate is the choke point.
- Not coverage for non-safety surfaces (onboarding content, settings, breathing screens). Jest handles those.
- Not a performance gate. Use `npm run perf:crisis` / `perf:breathing` / `perf:launch` for timing assertions.
- Not Android. iOS-only for v1 — Android UX is identical, so flows would be near-duplicates.

## One-time install (per developer Mac)

```bash
brew install maestro
maestro --version    # confirm
```

## Per-session prereq

Maestro drives an already-installed app on an already-booted sim. It does **not** build the app. Once per worktree session, run:

```bash
cd app
npm run ios          # builds + installs Being on the default sim
```

After that, the sim can stay open across multiple flow runs.

## Running the flows

```bash
# Full suite (all 5 safety flows, ~3–4 min)
npm run e2e:safety

# Individual flows (one at a time, ~30–60s each)
npm run e2e:safety:q9              # PHQ-9 Q9 single-alert pinning
npm run e2e:safety:phq9            # PHQ-9 ≥20 completion banner
npm run e2e:safety:gad7            # GAD-7 ≥15 completion banner
npm run e2e:safety:crisis-button   # crisis button reaches CrisisResources from each tab
npm run e2e:safety:988-dial        # 988 button does not show "Unable to Call" fallback
```

`/b-close` Phase 2.5 automatically picks the scoped subset of flows based on changed paths — see CLAUDE.md Workflow Commands.

## How a flow works

Each flow under `app/.maestro/`:

1. Starts with `appId: com.being.app` and `tags: [safety]`.
2. Calls `- launchApp: { clearState: true }` for a fresh install.
3. Runs `- runFlow: _legal-and-onboarding.yaml` to traverse the LegalGate (age picker + 4 consent toggles) and the 5-screen Onboarding flow before reaching the main tab navigator. This traversal is shared via the underscore-prefixed helper subflow.
4. Drives the safety surface (taps testIDs, asserts visible/notVisible).

The traversal subflow uses text-based selectors for legal-gate consent text (more robust than testIDs for legal copy that may rotate). It uses `optional: true` for onboarding intermediate Next/Continue taps so minor copy changes don't break flows — if a button isn't found, Maestro skips that step and continues.

## Anatomy of one flow

Take `q9-single-alert.yaml` as the canonical example:

```yaml
appId: com.being.app
tags:
  - safety
---
- launchApp: { clearState: true }
- runFlow: _legal-and-onboarding.yaml
- tapOn: { text: "Profile" }
- tapOn: { id: "take-phq9-button" }
- tapOn: { id: "assessment-begin-button" }
- repeat:
    times: 8
    commands:
      - tapOn: { id: "assessment-response-group-option-0" }
- tapOn: { id: "assessment-response-group-option-1" }   # Q9 > 0
- assertVisible: "Crisis Support Available"
- assertVisible: "Call 988 (Crisis Lifeline)"
- assertVisible: "Text 741741 (Crisis Text)"
- assertVisible: "Emergency 911"
- assertNotVisible: "View Resources"                    # old mockCrisisEngine copy
- assertNotVisible: "Call 988 Now"                       # old mockCrisisEngine copy
```

The `assertNotVisible` lines pin the MAINT-166 PR 1 fix: the old `mockCrisisEngine` alert ("View Resources" / "Call 988 Now") must not appear alongside the canonical alert. That was the double-Alert bug.

## Adding a new flow

When a work item touches the safety surface (signals: `crisis`, `988`, `PHQ`, `GAD`, `threshold`, `assessment`, `safety plan`, `emergency`), the deliverable extends to include a Maestro flow pinning the new contract.

1. Copy the closest existing flow as a starting point.
2. Use `maestro studio` (`maestro studio com.being.app`) to record taps against the sim — gives you exact testID / accessibility selectors.
3. Update the `name:` and `tags:` lines.
4. Wire it into `app/package.json`: add `e2e:safety:<name>` script.
5. Extend `/b-close` Phase 2.5 path-to-flow mapping if the new flow pins a contract not already covered by the path globs.
6. Add the test-only testIDs your flow needs to source files (prefer testID over text selectors for anything that isn't legal/copy-stable).
7. Document in this file under the flow list.

## Debugging a failing flow

Maestro's output names the failing step. Three common causes:

1. **TestID doesn't exist** — the most common failure. Grep the source for the testID. If it's missing, add it. If it changed, update the flow.
2. **Race condition** — assertion ran before the UI rendered. Use `extendedWaitUntil` instead of `assertVisible`:
   ```yaml
   - extendedWaitUntil:
       visible: { id: "results-crisis-banner" }
       timeout: 5000
   ```
   The 988-dial flow uses this pattern for the `notVisible: "Unable to Call"` assertion because the `Linking.openURL` → `canOpenURL` race resolves async.
3. **Onboarding traversal drift** — the `_legal-and-onboarding.yaml` subflow uses `optional: true` for intermediate Next/Continue taps because the Onboarding state machine has 5 sub-screens and copy may rotate. If a Next button has a new label that doesn't match `text: "Continue"` or `text: "Next"`, add the new label or use a testID.

To debug interactively:

```bash
cd app
maestro test .maestro/q9-single-alert.yaml --debug
maestro studio com.being.app
```

`maestro studio` opens a recorder window where each tap on the sim is captured and shown as YAML. Copy the captured YAML into a flow.

## `/b-close` Phase 2.5 gate

When `/b-close` is invoked, after the local commit, it runs:

```
git diff --name-only origin/development...HEAD | grep ...safety paths...
```

If anything matches (`app/src/features/(assessment|crisis)/`, `app/src/core/services/security/`, `app/src/core/navigation/CleanRootNavigator`, `app/app.json`, `app/ios/**/Info.plist`), the gate kicks in:

- **No match** → skipped with `ℹ️ No safety-surface changes`. Proceed to push.
- **Match, `--skip-e2e` set on `hotfix/*`** → bypassed with warning. Document why in PR body.
- **Match, `--skip-e2e` set on `feat/*` / `fix/*` / `chore/*`** → **hard refusal**. Run Maestro flows or rebase onto hotfix.
- **Match, no bypass** → sim-readiness check, then scoped flow run:
  - Touched `features/crisis/` → `e2e:safety:crisis-button` + `e2e:safety:988-dial`
  - Touched `features/assessment/` → `e2e:safety:q9` + `e2e:safety:phq9` + `e2e:safety:gad7`
  - Touched `app.json` / `Info.plist` only → `e2e:safety:988-dial`
  - Touched `services/security/` or `CleanRootNavigator` → full suite (cross-cutting)
- **Sim not ready** → exit cleanly with "Run `npm run ios` first, then retry /b-close". No auto-boot.
- **Flow fails** → print Maestro output, exit. Push is blocked.

## The 5 flows + what each pins

| Flow | What it pins | Source contract |
|---|---|---|
| `q9-single-alert.yaml` | PHQ-9 Q9 > 0 fires exactly one canonical alert (no `View Resources` / `Call 988 Now` from old mockCrisisEngine) | `assessmentStore.ts` `triggerEmergencyResponse` (alert copy) + MAINT-166 PR 1 (single-alert) |
| `phq9-severe-completion.yaml` | Score ≥20 (Q9=0) shows `results-crisis-banner` on completion | `safety.ts` `PHQ9_SEVERE_THRESHOLD = 20` |
| `gad7-severe.yaml` | Score ≥15 shows `results-crisis-banner` on completion | `safety.ts` `GAD7_SEVERE_THRESHOLD = 15` |
| `crisis-button-reachability.yaml` | Crisis button → `CrisisResources` from each of 4 tabs | CLAUDE.md "988 access <3 taps from any screen" |
| `crisis-988-dial.yaml` | Tapping 988 does NOT show "Unable to Call" fallback (i.e., `LSApplicationQueriesSchemes` still allows `tel:`) | `app/app.json` + `app/ios/Being/Info.plist` `LSApplicationQueriesSchemes` array (INFRA-147) |

## Out of scope (deferred)

- CI macOS-runner integration (cost vs. flake risk not justified)
- Non-safety surfaces (onboarding content, breathing, settings)
- Performance-budget assertions (Jest perf hooks own those)
- Android-specific flows (UX is identical)
- Maestro Cloud or paid Maestro products

## Predecessor work

INFRA-171 scoping/design lives at `~/.claude/plans/infra-171-shiny-hopcroft.md` (and the predecessor scoping note at `maint-166-sleepy-popcorn.md`). The MAINT-166 PR 1 incident is the proximate trigger.
