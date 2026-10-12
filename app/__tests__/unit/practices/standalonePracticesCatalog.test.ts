/**
 * MAINT-747 — the standalone practice catalog resolves against real module content.
 *
 * The catalog stores only identifiers (FEAT-293), so a renamed practice id or a moved
 * module would leave a dead library entry. Each ref is checked against the authored JSON
 * through the real loader and the real principle map.
 *
 * Route resolution for these refs is pinned in practiceNavigation.contract.test.ts and
 * is not repeated here.
 */

import { clearContentCache, loadModuleContent } from '@/core/services/moduleContent';
import {
  FEATURED_PRACTICE,
  STANDALONE_PRACTICES,
} from '@/features/practices/catalog/standalonePractices';
import { MODULE_TO_PRINCIPLE_MAP } from '@/features/learn/utils/principleMapping';

beforeEach(() => {
  clearContentCache();
});

describe('STANDALONE_PRACTICES', () => {
  it('control: the catalog is non-empty', () => {
    expect(STANDALONE_PRACTICES.length).toBeGreaterThan(0);
  });

  it('contains the featured practice by reference', () => {
    expect(STANDALONE_PRACTICES).toContain(FEATURED_PRACTICE);
  });

  it.each(STANDALONE_PRACTICES.map((ref) => [`${ref.moduleId}/${ref.practiceId}`, ref] as const))(
    '%s resolves to authored content under its own principle',
    async (_label, ref) => {
      const content = await loadModuleContent(ref.moduleId);
      expect(content.id).toBe(ref.moduleId);
      expect(content.practices.map((p) => p.id)).toContain(ref.practiceId);
      expect(ref.principleKey).toBe(MODULE_TO_PRINCIPLE_MAP[ref.moduleId]);
    },
  );
});
