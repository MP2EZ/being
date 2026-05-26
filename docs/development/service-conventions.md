# Service Conventions

Conventions for singleton services under `app/src/core/services/` and `app/src/features/**/services/`.

## Singleton `setInterval` must be guarded under `NODE_ENV === 'test'`

**Rule:** Every `setInterval(…)` call in a service file MUST be guarded by `process.env.NODE_ENV === 'test'` (either inside the timer-setup method or at the constructor that calls it).

**Why:** Unguarded singleton init timers keep Jest's event loop alive after tests teardown. The symptom is "Cannot log after tests are done" warnings firing on the interval cadence until GitHub Actions kills the orphan process at the 15-min job timeout wall. INFRA-144 fixed 2 services with this bug class; INFRA-175 fixed 5 more; INFRA-177 fixed the remaining 11 and added the enforcement script that gates this convention going forward.

### Pattern A — guard inside the init method (preferred for new code)

```typescript
private async initializeMonitoring(): Promise<void> {
  // INFRA-177: Skip interval setup in test environment to prevent Jest
  // worker hang from unguarded timers (INFRA-144/175 pattern).
  if (process.env.NODE_ENV === 'test') return;

  setInterval(() => this.checkSomething(), 30000);
}
```

### Pattern B — guard at the constructor that calls the init method

```typescript
private constructor() {
  // Match SecureStorageService.ts:183 — skip the long-lived setInterval
  // under Jest so the runtime can exit cleanly.
  if (process.env.NODE_ENV !== 'test') {
    this.initializeKeyRotationScheduler();
  }
}
```

Both patterns are valid. Pattern A is simpler when the method has only one caller. Pattern B reads cleaner when multiple constructor branches conditionally invoke the init.

### Enforcement

`scripts/check-service-interval-guards.js` runs in CI's **Security + compliance** job. It:

1. Globs `app/src/core/services/**/*.ts` + `app/src/features/**/services/**/*.ts` (excludes test files and React hooks)
2. For each `setInterval(` finds either Pattern A guard within 40 lines above, OR Pattern B guard at the enclosing-method's caller
3. Fails the build with `file:line` if neither pattern is found

### Escape hatch

For intentional non-singleton patterns (e.g., a stress-test runtime that self-clears via `clearInterval(handle)` in the same scope):

```typescript
// interval-guard-skip: stress-test runtime; clearInterval on duration elapse
const interval = setInterval(() => { /* … */ if (done) clearInterval(interval); }, 1000);
```

Use sparingly — expect 0-2 usages across the entire codebase.

## Related guard helpers

- **`--forceExit` on Jest scripts** (`test:security`, `test:safety`, `test:ci`, etc. in `app/package.json`): defense-in-depth so any *future* unguarded timer doesn't hang the whole suite. The guard is the real fix; `--forceExit` is the belt.
- **`--detectOpenHandles` on `test:security`** (`app/package.json:22`): surfaces leaked open handles instantly during local + CI test runs. Already enabled globally in dev mode via `jest.config.js:236` (`detectOpenHandles: isDevMode`); CI gets it scoped to test:security only.

## Precedent fixes

| Ticket | Services touched |
|---|---|
| INFRA-144 | `EncryptionService`, `SecureStorageService` (Pattern B) |
| INFRA-175 | `CrisisSecurityProtocol`, `IncidentResponseService`, `SecurityMonitoringService`, `NetworkSecurityService`, `AuthenticationService` (Pattern A) |
| INFRA-177 | 11 more services in `monitoring/`, `performance/`, `resilience/`, `supabase/` (Pattern A) + enforcement script + this doc |
