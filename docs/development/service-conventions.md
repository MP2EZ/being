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
| MAINT-190 | `AnalyticsService` Pattern A (missed by INFRA-175 — analytics was out of scope) + `__resetForTesting__` on all 8 stateful singletons (see below) |

## Singleton state must be resettable across tests (`__resetForTesting__`)

**Rule:** Every singleton service that holds mutable state (caches, queues, listener lists, in-memory audit logs, the `initialized: boolean` flag) MUST expose a `public static __resetForTesting__()` method.

**Why:** The interval guards above (INFRA-144/175/177) solved the *timer-leak* family of flakes — Jest no longer hangs. But the *state pollution* family persists because the `private static instance` survives across Jest test files within the same worker. Default-export evaluations (`export default X.getInstance()`) capture the reference at import time; any test that grabbed the reference before another test reset it sees stale state. Symptoms encountered:

- `CrisisSecurityProtocol not initialized` (CI's Security + compliance job, observed repeatedly post-INFRA-175)
- `SyncCoordinator.lastSyncTime` carrying timestamps from a prior test (MAINT-188 PR 5 Group C)
- `crisis-intervention-safety` perf flake (MAINT-188 PR 8)

All three trace to the same root: surviving singleton state, not surviving timers.

### Canonical pattern

```typescript
public static __resetForTesting__(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      'ServiceName.__resetForTesting__() called outside NODE_ENV=test — refusing to clear state in production'
    );
  }
  if (ServiceName.instance) {
    // 1. Clear any test-mode-permitted timer handles (most are NODE_ENV-guarded
    //    above, but AnalyticsService-style services that legitimately store
    //    handles for production cleanup need them cleared here too).
    if (ServiceName.instance.someTimer) {
      clearInterval(ServiceName.instance.someTimer);
      ServiceName.instance.someTimer = null;
    }
    // 2. Clear in-memory state.
    ServiceName.instance.someMap.clear();
    ServiceName.instance.someArray = [];
    // 3. Reset the initialization flag.
    ServiceName.instance.initialized = false;
  }
  // 4. Null the static instance so the next getInstance() builds fresh.
  ServiceName.instance = undefined as any;
}
```

### What the throw is protecting

The `NODE_ENV !== 'test'` throw is non-negotiable. A production caller hitting this method would silently:

- Drop the audit trail mid-session (CrisisSecurityProtocol → FTC HBNR + TDPSA §541.105 violation)
- Log the user out without firing the sign-out audit event (AuthenticationService)
- Abort in-flight network requests, corrupting partial uploads (NetworkSecurityService)
- Invalidate the AES key cache (EncryptionService) — sub-second perf regression invisible to the user until a slow flow

Throwing is the only safe failure mode. Don't downgrade to a console.warn.

### What this is NOT

`__resetForTesting__` is **additive to** production lifecycle methods (`destroy()`, signOut, etc.), not a replacement. Production code must continue to use the explicit lifecycle hooks; the reset is purely a test-isolation lever.

It also does NOT clear *persisted* state (expo-secure-store entries, master encryption keys, AsyncStorage). Those persist by design across the singleton's instance lifecycle. Tests that need a clean persisted store must call the explicit deletion APIs (`deleteMasterKey()`, `clearAllWellnessData()`, etc.).

### Usage in tests

```typescript
import { CrisisSecurityProtocol } from '@/features/crisis/services/CrisisSecurityProtocol';

afterEach(() => {
  CrisisSecurityProtocol.__resetForTesting__();
});
```

For tests that import the default-export singleton instance, the reset also voids that captured reference — they must re-grab via `getInstance()` after reset:

```typescript
// ❌ Wrong — `proto` is a stale ref after reset
import proto from '@/features/crisis/services/CrisisSecurityProtocol';
afterEach(() => { CrisisSecurityProtocol.__resetForTesting__(); });
test('a', () => { proto.someMethod(); });
test('b', () => { proto.someMethod(); /* stale! */ });

// ✅ Right — re-acquire each test
import { CrisisSecurityProtocol } from '@/features/crisis/services/CrisisSecurityProtocol';
afterEach(() => { CrisisSecurityProtocol.__resetForTesting__(); });
test('a', () => { CrisisSecurityProtocol.getInstance().someMethod(); });
test('b', () => { CrisisSecurityProtocol.getInstance().someMethod(); });
```

### Coverage

As of MAINT-190, all 8 stateful singletons in `core/services/security/`, `core/services/supabase/`, `core/analytics/`, and `features/crisis/services/` carry `__resetForTesting__`. Stateless utility singletons (e.g., `DeepLinkValidationService` — pure validator with no mutable instance state beyond the singleton flag itself) do not need the method but adding it is harmless.
