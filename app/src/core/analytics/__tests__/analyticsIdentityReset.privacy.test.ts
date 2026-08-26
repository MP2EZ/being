/**
 * DEBUG-539 — the analytics identity is destroyed on account erasure.
 *
 * WHY THIS FILE OVERRIDES THE GLOBAL expo-file-system MOCK
 * -------------------------------------------------------
 * `__tests__/setup/jest.setup.js` mocks `expo-file-system` STATELESSLY: `File`
 * returns `{write: jest.fn(), exists: false}` with no backing store. Under it,
 * deleting the reset step changes no assertion — the suite would be green on
 * fixed AND unfixed code, which is the exact fake-control class this work item
 * exists to remove. The module-scoped Map below is what lets the negative
 * controls actually fail.
 */

// ---------------------------------------------------------------------------
// Stateful expo-file-system double. `mock`-prefixed so babel-plugin-jest-hoist
// permits the factory to close over it.
// ---------------------------------------------------------------------------
const mockDocumentFiles = new Map<string, string>();

jest.mock('expo-file-system', () => ({
  Paths: { document: '/doc' },
  File: class {
    name: string;
    constructor(_dir: unknown, name: string) {
      this.name = name;
    }
    get exists(): boolean {
      return mockDocumentFiles.has(this.name);
    }
    delete(): void {
      // The real API THROWS when the target is absent. Reproducing that is what
      // proves the production `if (file.exists)` guard is load-bearing rather
      // than defensive — remove the guard and the never-consented path throws.
      if (!mockDocumentFiles.has(this.name)) throw new Error('ENOENT');
      mockDocumentFiles.delete(this.name);
    }
  },
}));

jest.mock('posthog-react-native', () => ({
  PostHogPersistedProperty: { Queue: 'queue', LogsQueue: 'logs_queue' },
}));

import { PostHogPersistedProperty } from 'posthog-react-native';
import {
  resetAnalyticsIdentity,
  registerAnalyticsClient,
  POSTHOG_RN_STORAGE_FILES,
  __resetRegisteredAnalyticsClientForTests,
  type AnalyticsIdentityResetTarget,
} from '../analyticsIdentityReset';

const OLD_ID = 'pre-erasure-distinct-id-0001';

/**
 * A PostHog stand-in that reproduces the two behaviours the fix turns on:
 * `persist()` re-serialises the WHOLE in-memory cache on every write, and
 * `reset()` mints a fresh anonymous id rather than emptying the file.
 */
function makeFakeClient(): AnalyticsIdentityResetTarget & {
  persist: () => void;
  cache: Record<string, unknown>;
} {
  const cache: Record<string, unknown> = {
    distinct_id: OLD_ID,
    [PostHogPersistedProperty.Queue]: [{ event: 'queued_before_erasure', distinct_id: OLD_ID }],
    [PostHogPersistedProperty.LogsQueue]: [{ msg: 'log_before_erasure' }],
  };
  const persist = (): void => {
    mockDocumentFiles.set(POSTHOG_RN_STORAGE_FILES[0], JSON.stringify({ version: 'v1', content: cache }));
  };
  persist();
  return {
    cache,
    persist,
    reset: () => {
      delete cache.distinct_id;
      // reset() ends in reloadFeatureFlags(), which re-mints and RE-PERSISTS a
      // fresh anonymous id. The file is not empty afterwards — which is why the
      // assertions below are "the OLD id is absent", never "the file is gone".
      cache.anonymous_id = 'freshly-minted-0002';
      persist();
    },
    setPersistedProperty: (key, value) => {
      if (value === null) delete cache[key as unknown as string];
      else cache[key as unknown as string] = value;
      persist();
    },
  };
}

const storedPayload = (): string => mockDocumentFiles.get(POSTHOG_RN_STORAGE_FILES[0]) ?? '';

beforeEach(() => {
  mockDocumentFiles.clear();
  __resetRegisteredAnalyticsClientForTests();
});

describe('DEBUG-539: an instance that EXISTS is reset through, never unlinked around', () => {
  it('drops the pre-erasure id and BOTH queues from the persisted payload', () => {
    const client = makeFakeClient();
    expect(storedPayload()).toContain(OLD_ID); // control: the leak is present first

    resetAnalyticsIdentity({ posthog: client });

    expect(storedPayload()).not.toContain(OLD_ID);
    expect(client.cache[PostHogPersistedProperty.Queue]).toBeUndefined();
    expect(client.cache[PostHogPersistedProperty.LogsQueue]).toBeUndefined();
  });

  it('nulls the LOGS queue too — the two route to different files', () => {
    // Nulling only `Queue` leaves `.posthog-rn-logs.json` intact. This assertion
    // is what makes that a regression rather than an oversight.
    const client = makeFakeClient();
    resetAnalyticsIdentity({ posthog: client });
    expect(client.cache[PostHogPersistedProperty.LogsQueue]).toBeUndefined();
  });

  it('does NOT unlink storage while an instance is alive', () => {
    // Unlinking under a live client is a fake control: its next persist writes
    // the file straight back from the in-memory cache.
    const client = makeFakeClient();
    resetAnalyticsIdentity({ posthog: client });
    expect(mockDocumentFiles.has(POSTHOG_RN_STORAGE_FILES[0])).toBe(true);
  });

  it('the identity does not COME BACK on a later persist', () => {
    // THE POST-CONDITION. Asserting the state immediately after reset() is not
    // enough — the defect class here is a write-back that restores the id on the
    // next AppState change. Simulate that write and re-assert.
    const client = makeFakeClient();
    resetAnalyticsIdentity({ posthog: client });
    client.persist();
    expect(storedPayload()).not.toContain(OLD_ID);
  });
});

describe('DEBUG-539: the registered instance is used when the caller has none', () => {
  it('resets through a registered client even though posthog is null', () => {
    // THE CENTRAL FIX. `PostHogProvider` stops rendering when consent is revoked,
    // so `usePostHog()` returns undefined and the caller passes null — but the
    // INSTANCE is still alive. Branching on "is a client mounted" would unlink
    // the files and let that instance rewrite them.
    const client = makeFakeClient();
    registerAnalyticsClient(client);

    resetAnalyticsIdentity({ posthog: null });

    expect(storedPayload()).not.toContain(OLD_ID);
    expect(client.cache[PostHogPersistedProperty.Queue]).toBeUndefined();
    // and it did NOT take the unlink branch
    expect(mockDocumentFiles.has(POSTHOG_RN_STORAGE_FILES[0])).toBe(true);
  });

  it('NEGATIVE CONTROL — without the registry the pre-erasure id survives', () => {
    // Proves the assertion above can fail. With no registered instance the call
    // takes the unlink arm, which cannot reach a live client's memory cache — so
    // a real client would re-persist OLD_ID on its next write.
    const client = makeFakeClient();
    // deliberately NOT registered
    resetAnalyticsIdentity({ posthog: null });
    client.persist();
    expect(storedPayload()).toContain(OLD_ID);
  });
});

describe('DEBUG-539: with no instance ever built, the residue is removed', () => {
  it('unlinks both storage files', () => {
    for (const f of POSTHOG_RN_STORAGE_FILES) mockDocumentFiles.set(f, `{"distinct_id":"${OLD_ID}"}`);

    resetAnalyticsIdentity({ posthog: null });

    for (const f of POSTHOG_RN_STORAGE_FILES) expect(mockDocumentFiles.has(f)).toBe(false);
  });

  it('does not throw when the files were never written', () => {
    // The never-consented path. `File.delete()` throws on a missing target, so
    // this asserts the `exists` guard is doing real work.
    expect(mockDocumentFiles.size).toBe(0);
    expect(() => resetAnalyticsIdentity({ posthog: null })).not.toThrow();
  });

  it('names BOTH files — a single-file sweep leaves the logs behind', () => {
    expect(POSTHOG_RN_STORAGE_FILES).toEqual(['.posthog-rn.json', '.posthog-rn-logs.json']);
  });
});
