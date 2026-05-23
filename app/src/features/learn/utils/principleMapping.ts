/**
 * Principle Mapping Utility (FEAT-133)
 *
 * Maps StoicPrinciple (snake_case) to ModuleId (kebab-case)
 * for navigation from Insights → Learn modules.
 *
 * StoicPrinciple: Used in practice flows and stoicPracticeStore
 * ModuleId: Used in education system and navigation
 */

import type { StoicPrinciple } from '@/features/practices/types/stoic';
import type { ModuleId } from '@/features/learn/types/education';

/**
 * Maps StoicPrinciple enum to corresponding ModuleId
 *
 * StoicPrinciple uses snake_case (from practices domain)
 * ModuleId uses kebab-case (from education domain)
 */
export const PRINCIPLE_TO_MODULE_MAP: Record<StoicPrinciple, ModuleId> = {
  aware_presence: 'aware-presence',
  radical_acceptance: 'radical-acceptance',
  sphere_sovereignty: 'sphere-sovereignty',
  virtuous_response: 'virtuous-response',
  interconnected_living: 'interconnected-living',
};

/**
 * Get ModuleId for a given StoicPrinciple
 *
 * @param principle - StoicPrinciple from practice engagement
 * @returns ModuleId for navigation to Learn tab
 */
export const getModuleIdForPrinciple = (principle: StoicPrinciple): ModuleId => {
  return PRINCIPLE_TO_MODULE_MAP[principle];
};

/**
 * Reverse mapping: ModuleId to StoicPrinciple
 * Useful for consistency checks
 */
export const MODULE_TO_PRINCIPLE_MAP: Record<ModuleId, StoicPrinciple> = {
  'aware-presence': 'aware_presence',
  'radical-acceptance': 'radical_acceptance',
  'sphere-sovereignty': 'sphere_sovereignty',
  'virtuous-response': 'virtuous_response',
  'interconnected-living': 'interconnected_living',
};

/**
 * Get StoicPrinciple for a given ModuleId
 *
 * @param moduleId - ModuleId from education system
 * @returns StoicPrinciple for practice tracking
 */
export const getPrincipleForModuleId = (moduleId: ModuleId): StoicPrinciple => {
  return MODULE_TO_PRINCIPLE_MAP[moduleId];
};
