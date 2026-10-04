/**
 * Purge PostHog's unsent queue the moment analytics consent is withdrawn (DEBUG-686).
 *
 * THE DEFECT THIS CLOSES
 * ----------------------
 * `optOut()` only flips the persisted `OptedOut` flag, which gates `enqueue()` —
 * the CAPTURE path. `flush()` checks `disabled` only, and `_flush()` sends the
 * whole `Queue` after `await _initPromise`. posthog-react-native flushes on every
 * AppState change and persists the queue to `.posthog-rn.json`. So everything
 * captured while consented was still transmitted after withdrawal — on the next
 * background/foreground, the 30 s timer, an explicit flush, or the next launch.
 *
 * WHY A SYNCHRONOUS STORE SUBSCRIPTION AND NOT AN EFFECT
 * ------------------------------------------------------
 * `ConsentSync`'s `useEffect` runs after React commits, which leaves a window
 * between the consent store write and the effect in which an AppState flush can
 * send the queue. `store.subscribe` runs inside the `set()` call itself, so no
 * trigger that starts after the consent write can observe a pre-withdrawal queue.
 *
 * Level-triggered and idempotent: it fires on every store write whose outcome is
 * `purge` (purging an empty queue is a no-op) and never while `emit` or `hold`.
 * The grant edge is therefore never purged — the write that flips the outcome to
 * `emit` is, by construction, a write on which this does nothing.
 *
 * WHY THE PURGE GOES THROUGH THE SDK'S `wrap()` (deviation from the batch plan)
 * ---------------------------------------------------------------------------
 * Before the client has initialised, its storage preload has not returned, and
 * when it does it MERGES the persisted file into the in-memory cache — restoring
 * a queue purged in the meantime. Two simpler shapes were tried against the real
 * SDK and both fail in `PostHogProvider.consentWithdrawalPurge.privacy.test.ts`:
 *
 *   1. Purge immediately, then re-purge on `ready()`. The immediate write
 *      persists the not-yet-loaded (near-empty) cache over the file the preload
 *      is about to read, so the user's distinct_id is dropped and a new one is
 *      minted — an identity reset by side effect, contrary to ruling 8(b).
 *   2. Defer the purge to `ready().then(...)`. `ready()` is an async wrapper over
 *      `_initPromise`, so its continuation lands a microtask AFTER that of a
 *      flush already awaiting `_initPromise` — and `_flush()` reads `Queue` on
 *      that earlier tick. A background/foreground between withdrawal and init
 *      completion therefore still sends the restored queue (AC2).
 *
 * `wrap(fn)` is the SDK's own sequencing primitive: it runs `fn` synchronously
 * once initialised, and otherwise registers it directly on `_initPromise` — at
 * withdrawal time, so ahead of any flush that starts later. It is `protected` in
 * the typings, hence the narrow structural read below; the real-SDK suite pins
 * the behaviour, so an SDK upgrade that changes it fails there, not silently.
 * The re-check inside the deferred callback keeps a withdraw-then-re-grant
 * before init from wiping the re-granted session's queue.
 *
 * WHAT IT NEVER DOES
 * ------------------
 * No `flush()` (that would transmit the queue), no `reset()` (identity survives
 * withdrawal — ruling 8(b)), no client rebuild, no `POSTHOG_OPTIONS` change
 * (ruling 8(a): an already in-flight batch is an accepted, bounded residual).
 * It touches only PostHog's own storage keys: the Supabase crisis-telemetry queue
 * is a different sink under a different legal basis and is not reachable from
 * here — this module imports nothing from `core/services/supabase/` or
 * `features/crisis/`.
 */

import { useConsentStore } from '@/core/stores/consentStore';
import { logSecurity } from '@/core/services/logging';
import { analyticsConsentOutcome, type AnalyticsConsentState } from './analyticsConsentOutcome';
import { purgeAnalyticsQueues, type AnalyticsQueuePurgeTarget } from './analyticsQueuePurge';

/** What the purge needs from the client. Structural so a fake can stand in. */
export interface ConsentWithdrawalPurgeTarget extends AnalyticsQueuePurgeTarget {
  optOut: () => unknown;
}

/** The two store methods used. A parameter so tests can pass a store of their own. */
export interface ConsentStoreLike {
  getState: () => AnalyticsConsentState;
  subscribe: (listener: (state: AnalyticsConsentState) => void) => () => void;
}

type SdkSequencer = { wrap?: (fn: () => void) => void };

function logFailure(stage: string, error: unknown): void {
  logSecurity('[Analytics] consent-withdrawal purge failed', 'high', {
    stage,
    error: error instanceof Error ? error.message : 'Unknown error',
  });
}

/**
 * Subscribe `client` to consent withdrawal. Returns the unsubscribe function.
 *
 * Structurally non-throwing. A client without `optOut`/`setPersistedProperty`
 * (e.g. a test double) gets a no-op subscription and nothing else.
 */
export function installConsentWithdrawalPurge(
  client: Partial<ConsentWithdrawalPurgeTarget> | null | undefined,
  store: ConsentStoreLike = useConsentStore,
): () => void {
  if (
    !client ||
    typeof client.optOut !== 'function' ||
    typeof client.setPersistedProperty !== 'function'
  ) {
    return () => undefined;
  }
  const target = client as ConsentWithdrawalPurgeTarget;

  const purgeIfStillWithdrawn = (): void => {
    try {
      if (analyticsConsentOutcome(store.getState()) === 'purge') purgeAnalyticsQueues(target);
    } catch (error) {
      logFailure('purge', error);
    }
  };

  const fire = (): void => {
    // 1. Opt out first, so nothing re-enqueues behind the purge.
    try {
      void Promise.resolve(target.optOut()).catch((error: unknown) => logFailure('optOut', error));
    } catch (error) {
      logFailure('optOut', error);
    }
    // 2. Purge — now if initialised, otherwise ahead of any later flush (see header).
    try {
      const { wrap } = target as unknown as SdkSequencer;
      if (typeof wrap === 'function') wrap.call(target, purgeIfStillWithdrawn);
      else purgeIfStillWithdrawn();
    } catch (error) {
      logFailure('sequence', error);
    }
  };

  const onState = (state: AnalyticsConsentState): void => {
    try {
      if (analyticsConsentOutcome(state) === 'purge') fire();
    } catch (error) {
      logFailure('evaluate', error);
    }
  };

  let unsubscribe: () => void = () => undefined;
  try {
    unsubscribe = store.subscribe(onState);
    const initial = store.getState();
    // A store already hydrated when the client arrives (e.g. a remount) gets one
    // check now; a `loading` store is handled by the subscription when it resolves.
    if (initial.consentStatus !== 'loading') onState(initial);
  } catch (error) {
    logFailure('install', error);
  }
  return () => {
    try {
      unsubscribe();
    } catch (error) {
      logFailure('uninstall', error);
    }
  };
}
