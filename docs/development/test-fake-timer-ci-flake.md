# Fake-timer + coverage CI flake (INFRA-180)

## TL;DR

Tests that combine `jest.useFakeTimers()` with React component rendering pass locally on macOS + Node 22 under `npm run test:ci` (the exact CI command) but fail on GitHub Actions Ubuntu + Node 20 runners with `Exceeded timeout of 30000 ms for a hook`.

A partial fix is well-understood and works locally. The CI-specific divergence is environmental (Ubuntu / Node 20) and was not isolated within INFRA-180's 2-hour timebox.

**Quarantined tests this affects** (re-quarantined in `app/jest.config.js`):

- `__tests__/integration/learn/practices/PracticeTimerScreen.test.tsx`
- `__tests__/integration/learn/practices/ReflectionTimerScreen.test.tsx`
- `__tests__/integration/learn/practices/BodyScanScreen.test.tsx`
- `__tests__/screens/midday/EmbodimentScreen.test.tsx` (chronic, pre-INFRA-180)
- `src/core/services/subscription/__tests__/subscription.integration.test.ts` (MAINT-166 PR 2)

## What works (partial fix, locally)

Two-step conversion that makes these tests pass under `npm run test:ci` locally:

1. **Add fake timers to `beforeEach`:**
   ```ts
   beforeEach(() => {
     jest.clearAllMocks();
     jest.useFakeTimers();
   });
   afterEach(() => {
     jest.useRealTimers();
   });
   ```

2. **Convert ALL `await new Promise(r => setTimeout(r, N))` patterns** (not just `waitFor` timeouts):
   ```ts
   // BAD (hangs under fake timers — the setTimeout never resolves):
   await act(async () => {
     await new Promise(resolve => setTimeout(resolve, 10));
   });

   // GOOD:
   await act(async () => {
     jest.advanceTimersByTime(10);
   });
   ```

3. **Convert timer-completion `waitFor` patterns** to direct timer advancement:
   ```ts
   // BAD (waits 2000ms real time, may flake on CI):
   await waitFor(() => expect(getByTestId('completion')).toBeTruthy(), { timeout: 2000 });

   // GOOD:
   await act(async () => { jest.advanceTimersByTime(1000); });
   expect(getByTestId('completion')).toBeTruthy();
   ```

**MAINT-166 PR 3 (PR #70) missed step 2**, which is what blew up that attempt on CI.

## What doesn't work (CI-specific failure)

Even with all three conversions applied properly, CI still reports:

```
thrown: "Exceeded timeout of 30000 ms for a hook"
```

— pointing at the test file's import line (line 18: `import { render, fireEvent, waitFor, act } from '@testing-library/react-native'`). Jest's error reporting points at the import line when it can't localize the hang elsewhere; that's not where the actual hang is.

The 116 tests pass in **3.2 seconds** locally under the exact CI command (`jest --testPathPattern=integration --verbose --testTimeout=30000 --forceExit --ci` and `jest --coverage --ci --watchAll=false --forceExit`). On GitHub Actions Ubuntu runners, they hang for 30s+ each.

## Environmental differences (suspected)

| | Local | CI |
|---|---|---|
| OS | macOS | Ubuntu latest |
| Node | 22.x | 20 (per `.github/workflows/ci.yml` `NODE_VERSION: '20'`) |
| Test runner concurrency | Default jest worker count | Same (default), but different worker characteristics under Linux |
| Coverage instrumentation | Same babel-istanbul | Same |

## Hypotheses NOT ruled out

INFRA-180 could not test these within the 2-hour box:

- **Node 20 vs 22 fake-timer behavior**: Jest's modern fake timers may have edge cases on older Node versions
- **Ubuntu kernel timer resolution**: scheduling may interact poorly with Jest's fake-timer implementation under CI
- **GitHub Actions worker memory pressure**: workers running low on RAM may pause garbage collection in ways that affect fake-timer callbacks
- **`test-automation-setup.js` global beforeEach** (`jest.spyOn(console, 'warn')` + `error`) creating different ordering under Linux scheduler

## Hypotheses ruled out

- ❌ `clearAllMocks` ordering vs `useFakeTimers`: same failure when reversed locally (well, untested under CI — but locally same)
- ❌ Missing `jest.advanceTimersByTime` in rapid-toggle: that's the PR 3 miss; fixed locally; CI still fails
- ❌ `legacyFakeTimers: true` workaround: surfaced `"timers APIs are not mocked"` warning on CI; not a fix
- ❌ Coverage instrumentation alone: local `--coverage --ci` passes; CI uses NO coverage on integration tests (`test:integration -- --ci`) — coverage isn't the variable

## Path forward when next attempted

1. **Reproduce on Linux first.** Install Node 20 via nvm (or run in Docker via `node:20-bookworm` image), then `npm run test:integration -- --ci --testTimeout=30000`. If that reproduces, the issue is Node 20 + Jest 29 fake timers.

2. **If reproduced**: check Jest issue tracker for fake-timer-related bugs on Node 20. Likely workaround: pin Node version to 22 in `.github/workflows/ci.yml` (`NODE_VERSION: '22'`).

3. **If still doesn't reproduce on local Linux**: the variable is GitHub Actions runner specifics — worker concurrency, memory, kernel. Add `--runInBand` to test:ci to remove worker concurrency.

4. **Nuclear option**: rewrite the mock Timer in these test files to NOT use `setInterval` at all — fire `onTick`/`onComplete` synchronously via `useEffect`. Skips the timer interaction entirely. Trade-off: tests no longer verify timer-tick behavior, only behavior-on-completion.

## Quarantine policy

These tests are valid local development tools. They run cleanly in <5 seconds with `npx jest <path> --coverage --ci`. They're excluded from CI to avoid noise while the root cause sits unresolved.

When working on safety-adjacent timer behavior (assessment timers, breathing animations, body scan progressions), **run these tests locally before pushing**. The CI safety net for these components is the Maestro flows (`app/.maestro/`), which exercise the user-visible behavior end-to-end.

## Related work

- **INFRA-180** (this investigation)
- **MAINT-166 PR 3 / PR #70**: the closed attempt that surfaced the issue
- **MAINT-166 PR 2**: backed off `subscription.integration.test.ts` for the same root cause family
- **EmbodimentScreen.test.tsx**: long-standing chronic failure, same family
