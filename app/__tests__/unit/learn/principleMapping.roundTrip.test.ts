/**
 * MAINT-747 — principle <-> module mapping round trips.
 *
 * Enumerates the canonical PRINCIPLES list (not Object.keys of either map): a principle
 * missing from a map would otherwise vanish from its own check.
 */

import { getAllModuleIds } from '@/core/services/moduleContent';
import {
  MODULE_TO_PRINCIPLE_MAP,
  PRINCIPLE_TO_MODULE_MAP,
  getModuleIdForPrinciple,
  getPrincipleForModuleId,
} from '@/features/learn/utils/principleMapping';
import { PRINCIPLES } from '@/features/practices/shared/constants/principles';

describe('principle mapping round trips', () => {
  it('control: both enumerations are non-empty', () => {
    expect(PRINCIPLES.length).toBeGreaterThan(0);
    expect(getAllModuleIds().length).toBeGreaterThan(0);
  });

  it.each(PRINCIPLES.map((p) => p.key))('principle %s -> module -> principle is the identity', (key) => {
    const moduleId = getModuleIdForPrinciple(key);
    expect(moduleId).toBeDefined();
    expect(getPrincipleForModuleId(moduleId)).toBe(key);
  });

  it.each(getAllModuleIds())('module %s -> principle -> module is the identity', (moduleId) => {
    const principle = getPrincipleForModuleId(moduleId);
    expect(principle).toBeDefined();
    expect(getModuleIdForPrinciple(principle)).toBe(moduleId);
  });

  it('the canonical principle list and the module list are the same size', () => {
    expect(PRINCIPLES.length).toBe(getAllModuleIds().length);
  });

  it('both maps have the same number of keys', () => {
    expect(Object.keys(PRINCIPLE_TO_MODULE_MAP).length).toBe(Object.keys(MODULE_TO_PRINCIPLE_MAP).length);
  });
});
