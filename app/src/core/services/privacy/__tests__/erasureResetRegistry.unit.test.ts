/**
 * erasureResetRegistry (DEBUG-671) — settles every reset, never rejects.
 *
 * Crisis ruling: `assessmentStore` registers at module scope on its eager import,
 * so registration must never throw, and a reset that throws synchronously (zustand
 * calls listeners inside `setState`) must settle like a rejection rather than
 * escape `Promise.allSettled`.
 */

type Registry = typeof import('../erasureResetRegistry');

let registry: Registry;

beforeEach(() => {
  jest.useFakeTimers();
  jest.isolateModules(() => {
    registry = require('../erasureResetRegistry');
  });
});

afterEach(() => {
  jest.useRealTimers();
});

/** Drain microtasks without moving the clock. */
async function drain(): Promise<void> {
  for (let i = 0; i < 5; i++) await jest.advanceTimersByTimeAsync(0);
}

/** Track a promise's settlement so a test can prove it has NOT settled yet. */
function observe<T>(promise: Promise<T>): { settled: boolean; value?: T; error?: unknown } {
  const state: { settled: boolean; value?: T; error?: unknown } = { settled: false };
  promise.then(
    (value) => {
      state.settled = true;
      state.value = value;
    },
    (error) => {
      state.settled = true;
      state.error = error;
    },
  );
  return state;
}

it('runs every registered reset and reports none failed or timed out', async () => {
  const a = jest.fn();
  const b = jest.fn(async () => undefined);
  registry.registerErasureReset('a', a);
  registry.registerErasureReset('b', b);

  await expect(registry.resetInMemoryStateForErasure()).resolves.toEqual({
    failed: [],
    timedOut: [],
  });
  expect(a).toHaveBeenCalledTimes(1);
  expect(b).toHaveBeenCalledTimes(1);
});

it('settles a synchronous throw and a rejection, runs the rest, and names both', async () => {
  const survivor = jest.fn();
  registry.registerErasureReset('throws', () => {
    throw new Error('listener exploded');
  });
  registry.registerErasureReset('rejects', async () => {
    throw new Error('keychain busy');
  });
  registry.registerErasureReset('survivor', survivor);

  await expect(registry.resetInMemoryStateForErasure()).resolves.toEqual({
    failed: ['throws', 'rejects'],
    timedOut: [],
  });
  expect(survivor).toHaveBeenCalledTimes(1);
});

it('waits for an async reset to finish before resolving', async () => {
  let finished = false;
  registry.registerErasureReset('slow', async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    finished = true;
  });

  const run = registry.resetInMemoryStateForErasure();
  await jest.advanceTimersByTimeAsync(10);
  await run;
  expect(finished).toBe(true);
});

it('re-registering an owner replaces it rather than throwing or running twice', async () => {
  const first = jest.fn();
  const second = jest.fn();
  registry.registerErasureReset('store', first);
  expect(() => registry.registerErasureReset('store', second)).not.toThrow();

  await registry.resetInMemoryStateForErasure();
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
  expect(registry.registeredErasureResetOwners()).toEqual(['store']);
});

it('resolves with nothing registered', async () => {
  await expect(registry.resetInMemoryStateForErasure()).resolves.toEqual({
    failed: [],
    timedOut: [],
  });
});

describe('DEBUG-789 — the registry-wide deadline', () => {
  it('is bounded well inside a user-tolerable wait', () => {
    expect(registry.ERASURE_RESET_DEADLINE_MS).toBeLessThanOrEqual(5000);
    expect(registry.ERASURE_RESET_DEADLINE_MS).toBeGreaterThan(0);
  });

  it('resolves exactly at the deadline when a reset never settles, naming it as timed out', async () => {
    const survivor = jest.fn();
    registry.registerErasureReset('hung', () => new Promise<void>(() => undefined));
    registry.registerErasureReset('survivor', survivor);

    const run = observe(registry.resetInMemoryStateForErasure());

    await jest.advanceTimersByTimeAsync(registry.ERASURE_RESET_DEADLINE_MS - 1);
    expect(run.settled).toBe(false);

    await jest.advanceTimersByTimeAsync(1);
    expect(run.settled).toBe(true);
    expect(run.error).toBeUndefined();
    expect(run.value).toEqual({ failed: [], timedOut: ['hung'] });
    expect(survivor).toHaveBeenCalledTimes(1);
  });

  it('keeps failed and timed-out owners distinct', async () => {
    registry.registerErasureReset('throws', () => {
      throw new Error('listener exploded');
    });
    registry.registerErasureReset('rejects', async () => {
      throw new Error('keychain busy');
    });
    registry.registerErasureReset('hung', () => new Promise<void>(() => undefined));
    registry.registerErasureReset('fine', async () => undefined);

    const run = observe(registry.resetInMemoryStateForErasure());
    await jest.advanceTimersByTimeAsync(registry.ERASURE_RESET_DEADLINE_MS);

    expect(run.value).toEqual({ failed: ['throws', 'rejects'], timedOut: ['hung'] });
  });

  it('does not wait for the deadline when every reset settles, and leaves no timer behind', async () => {
    registry.registerErasureReset('a', async () => undefined);
    registry.registerErasureReset('b', () => undefined);

    const run = observe(registry.resetInMemoryStateForErasure());
    await drain();

    expect(run.settled).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('leaves no timer behind after hitting the deadline either', async () => {
    registry.registerErasureReset('hung', () => new Promise<void>(() => undefined));
    const run = observe(registry.resetInMemoryStateForErasure());
    await jest.advanceTimersByTimeAsync(registry.ERASURE_RESET_DEADLINE_MS);
    expect(run.settled).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('a reset that rejects after the deadline is inert (no unhandled rejection)', async () => {
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);
    try {
      let rejectLate: (e: Error) => void = () => undefined;
      registry.registerErasureReset(
        'late',
        () => new Promise<void>((_, reject) => { rejectLate = reject; }),
      );
      const run = observe(registry.resetInMemoryStateForErasure());
      await jest.advanceTimersByTimeAsync(registry.ERASURE_RESET_DEADLINE_MS);
      expect(run.value).toEqual({ failed: [], timedOut: ['late'] });

      rejectLate(new Error('landed after the deadline'));
      await drain();
      expect(unhandled).not.toHaveBeenCalled();
      expect(run.value).toEqual({ failed: [], timedOut: ['late'] });
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });
});
