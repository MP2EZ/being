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
  jest.isolateModules(() => {
    registry = require('../erasureResetRegistry');
  });
});

it('runs every registered reset and reports none failed', async () => {
  const a = jest.fn();
  const b = jest.fn(async () => undefined);
  registry.registerErasureReset('a', a);
  registry.registerErasureReset('b', b);

  await expect(registry.resetInMemoryStateForErasure()).resolves.toEqual([]);
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

  await expect(registry.resetInMemoryStateForErasure()).resolves.toEqual(['throws', 'rejects']);
  expect(survivor).toHaveBeenCalledTimes(1);
});

it('waits for an async reset to finish before resolving', async () => {
  let finished = false;
  registry.registerErasureReset('slow', async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    finished = true;
  });

  await registry.resetInMemoryStateForErasure();
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
  await expect(registry.resetInMemoryStateForErasure()).resolves.toEqual([]);
});
