/**
 * DEBUG-719 — loadModuleContent refuses an unauthored id before reading its cache.
 *
 * `contentCache` is a plain object, so `contentCache['constructor']` is `Object`: truthy,
 * and it used to be returned as module content. The loader now rejects any id that is not
 * an authored module id, before the cache is consulted.
 */

import { clearContentCache, loadModuleContent } from '@/core/services/moduleContent';
import type { ModuleId } from '@/features/learn/types/education';

beforeEach(() => {
  clearContentCache();
});

describe('loadModuleContent (DEBUG-719)', () => {
  it('control: an authored id resolves to its content', async () => {
    const content = await loadModuleContent('aware-presence');
    expect(content.id).toBe('aware-presence');
  });

  it('control: a second load of an authored id is served (cache path)', async () => {
    const first = await loadModuleContent('sphere-sovereignty');
    await expect(loadModuleContent('sphere-sovereignty')).resolves.toBe(first);
  });

  it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty', 'bogus'])(
    '%s rejects',
    async (id) => {
      await expect(loadModuleContent(id as ModuleId)).rejects.toThrow(Error);
    },
  );

  it('rejects an unauthored id without echoing it in the message', async () => {
    const error = await loadModuleContent('zq-sentinel-7731' as ModuleId).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message.length).toBeGreaterThan(0);
    expect((error as Error).message).not.toContain('zq-sentinel-7731');
  });
});
