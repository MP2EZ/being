# INFRA-180 — CI "fake-timer flake" — RESOLVED (2026-05-28)

## Resolution

The original framing of this issue as a "Jest fake-timer + coverage interaction on Ubuntu" was **wrong**. The actual root cause was a **duplicated `--testTimeout=30000` CLI flag** introduced by combining `npm run test:integration` (which had `--testTimeout=30000` baked into the script) with the CI yaml line (`-- --ci --testTimeout=30000`).

Yargs (Jest's CLI parser) treats repeated `--testTimeout=N` flags as an **array** `[30000, 30000]`. Jest formatted that into error messages as `"Exceeded timeout of 30000,30000 ms for a test"` — the comma being the smoking gun nobody noticed in the original investigation. When Jest used the value as an actual duration: `Number([30000, 30000])` = `NaN`; `setTimeout(NaN)` is treated as `setTimeout(0)`; tests with async `waitFor` assertions failed in ~10 ms.

Synchronous tests in the same files passed because they finished before the 0-ms timeout could fire. That asymmetry was the source of the "23/34 pass" pattern that disguised the bug as flakiness.

## The fix

One line in `app/package.json` — removed the duplicate from the script (CI yaml retains its `--testTimeout=30000` for explicit timeout control at the CI invocation site):

```diff
- "test:integration": "jest --testPathPattern=integration --verbose --testTimeout=30000 --forceExit",
+ "test:integration": "jest --testPathPattern=integration --verbose --forceExit",
```

This matches the pattern of the other CI-invoked test scripts (`test:unit`, `test:security`, `test:accessibility`, `test:performance`, `test:encryption`) — none of which carry a `--testTimeout` in the package.json script; all receive it from the CI yaml when needed.

## Tests re-enabled

Re-enabled in `app/jest.config.js`'s `testPathIgnorePatterns`:

- `__tests__/integration/learn/practices/PracticeTimerScreen.test.tsx`
- `__tests__/integration/learn/practices/ReflectionTimerScreen.test.tsx`
- `__tests__/integration/learn/practices/BodyScanScreen.test.tsx`
- `src/core/services/subscription/__tests__/subscription.integration.test.ts`

Total: **127 newly-passing tests on CI** (previously quarantined under this "flake" umbrella).

## Tests NOT unblocked by this fix (different root causes)

These remain quarantined under `testPathIgnorePatterns` because the underlying issues are scenario-level, not a CLI flag bug:

- `sync-coordinator-integration.test.ts` — 12 tests assert `status.isInitialized` on the SyncStatus shape; that field no longer exists (now `globalState`). Needs assertion shape rewrite. (MAINT-166 PR 5 docstring.)
- `analytics-service-integration.test.ts` — 8 tests assert AnalyticsService return-shape fields that drifted. Needs separate AnalyticsService API audit. (MAINT-166 PR 5.)
- `sync-emergency-scenarios.test.ts` — 13 tests assert `Alert.alert` was called from sync code, but Alert is fired by UI components, not the SyncCoordinator subscription callback. Layer mismatch; right home is a Maestro flow. (MAINT-166 PR 5.)
- `sync-performance-validation.test.ts` + `week3-analytics-performance.test.ts` — performance tests in Jest are flaky by construction; honest home is on-device measurement, not Jest. (MAINT-166 PR 5 + PR 7.)
- `practices-flows-integration.test.tsx` — testID drift (`safety-button` → `collapsible-crisis-button`) + 8-second real-timer assertions. Needs per-assertion audit + fake-timer conversion. (MAINT-166 PR 4.)
- `comprehensive-assessment-integration.test.ts` — fixed structurally in MAINT-166 PR 4 (state() helper, encryption mock, canonical CrisisDetection shape); 8/12 pass locally; remaining 4 skipped with TODOs. Re-quarantined because **this file was also misblamed on INFRA-180** — but its actual remaining failures are scenario-specific. Worth re-attempting now that the duplicate-flag bug is fixed.
- `EmbodimentScreen.test.tsx` (chronic, pre-INFRA-180) — `Cannot find module` from the pre-INFRA-143 `services/` → `features/` restructure. Different bug entirely.

## How the previous investigation missed it

The original time-boxed work (INFRA-180 first round, 2 hours) looked at the right symptom space (`Exceeded timeout of 30000 ms`) but treated `30000,30000` as a normal `30000` value during analysis — the comma was discounted as report formatting noise. The hypotheses then drove toward Jest internals, Node version, OS scheduling, coverage instrumentation — all dead-ends because none of them produced an array-typed timeout.

The breakthrough this round was reproducing the error locally using the **exact CI invocation** (`npm run test:integration -- --ci --testTimeout=30000`). The literal `30000,30000` in the local error was identical to the CI error, which made the doubled-flag origin obvious.

## Lesson for future flakes

When a test failure message contains an unexpected character (a comma, a duplicated value, a malformed unit), **trust the literal message before reaching for environmental hypotheses**. The cheapest reproduction is always running the exact same command locally; if the local error matches CI character-for-character, the variable is the command itself, not the environment.

## Related work

- **INFRA-180** (this ticket — both rounds)
- **MAINT-166 PR 3 / PR #70**: the closed attempt that surfaced the symptom
- **MAINT-166 PR 2**: re-quarantined `subscription.integration.test.ts` for what was assumed to be the same flake — turns out it was. Re-enabled in this PR.
- **MAINT-166 PR 6**: Husky precommit on macOS caught `crisis-intervention-safety.test.ts` flaking intermittently. That file's flake is **separate** from INFRA-180 (it doesn't use `test:integration`) — likely a performance-budget flake (variable sub-100ms timing assertion under a busy machine). Tracked as a follow-up.
