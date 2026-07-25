/**
 * STANDALONE PRACTICE CATALOG (FEAT-293)
 *
 * The curated set of practices promoted out of Learn onto a primary surface.
 *
 * Stores ONLY stable identifiers — no titles, durations, or prose. Everything
 * displayable is read from the authored module JSON at render time, so this file
 * cannot drift from the content the way a duplicated title or duration would.
 *
 * Curation is deliberately small. Twelve practices exist across the five
 * modules, six of them generic reflection timers; surfacing all of them would
 * make the library a list rather than an invitation. The set below covers the
 * four the user story names — breathing, body scan, reflection, and especially
 * the Stoic sorting drill.
 *
 * PRINCIPLE ATTRIBUTION IS LOAD-BEARING, not cosmetic. Each entry declares the
 * principle it actually belongs to, and the library groups by that. Breathing
 * and the body scan are the Aware Presence limb (embodied/metacognitive
 * awareness) and must never be presented as classical Stoic technique. The
 * Reserve Clause is hypexhairesis and belongs to Sphere Sovereignty — filing it
 * under Aware Presence to get a tidier screen would be a mis-attribution.
 */

import type { ModuleId } from '@/features/learn/types/education';
import type { StoicPrinciple } from '@/features/practices/types/stoic';

export interface StandalonePracticeRef {
  /** Drives the section heading; must be the practice's OWN principle. */
  principleKey: StoicPrinciple;
  moduleId: ModuleId;
  practiceId: string;
}

/**
 * The dichotomy-of-control drill, promoted to a first-class Stoic practice
 * (FEAT-293 AC2). Rendered as the featured card, not as a list row.
 */
export const FEATURED_PRACTICE: StandalonePracticeRef = {
  principleKey: 'sphere_sovereignty',
  moduleId: 'sphere-sovereignty',
  practiceId: 'control-sorting',
};

export const STANDALONE_PRACTICES: readonly StandalonePracticeRef[] = [
  FEATURED_PRACTICE,
  // Sphere Sovereignty — the reserve clause is hypexhairesis ("fate
  // permitting"), releasing attachment to outcome. Stays with its own principle.
  {
    principleKey: 'sphere_sovereignty',
    moduleId: 'sphere-sovereignty',
    practiceId: 'reserve-clause',
  },
  // Aware Presence — the mindfulness limb. NOT classical Stoic exercises.
  {
    principleKey: 'aware_presence',
    moduleId: 'aware-presence',
    practiceId: 'breathing-space',
  },
  {
    principleKey: 'aware_presence',
    moduleId: 'aware-presence',
    practiceId: 'body-scan',
  },
] as const;
