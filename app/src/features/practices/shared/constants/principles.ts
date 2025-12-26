/**
 * STOIC MINDFULNESS PRINCIPLES - Shared Constants
 *
 * 5 Stoic Mindfulness Principles (Philosopher-Validated 9.7/10)
 * FEAT-45: Consolidated from 12 principles to 5 integrative principles.
 *
 * MAINT-65: Extracted from PrincipleFocusScreen for reuse across flows.
 * Used by: PrincipleFocusScreen (morning), StoicPrinciplePicker (midday/evening)
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md (v1.1 LOCKED)
 * @see /docs/product/stoic-mindfulness/principles/ for detailed documentation
 */

import type { StoicPrinciple } from '@/features/practices/types/stoic';

export interface PrincipleInfo {
  key: StoicPrinciple;
  title: string;
  description: string;
  integrates: string; // Which legacy principles this consolidates
  source: string;
}

/**
 * 5 Stoic Mindfulness Principles (Philosopher-Validated 9.7/10)
 *
 * Each principle integrates multiple legacy practices into a cohesive whole.
 * Order is intentional: presence → acceptance → agency → response → connection
 */
export const PRINCIPLES: PrincipleInfo[] = [
  {
    key: 'aware_presence',
    title: 'Aware Presence',
    description: 'Be fully here now, observing thoughts as mental events rather than truth, and feeling what\'s happening in your body.',
    integrates: 'Present Perception + Metacognitive Space + Embodied Awareness',
    source: 'Marcus Aurelius, Meditations 2:1',
  },
  {
    key: 'radical_acceptance',
    title: 'Radical Acceptance',
    description: 'This is what\'s happening right now. I may not like it, prefer it, or want it, but it is the reality I face. What do I do from here?',
    integrates: 'Amor Fati (standalone principle)',
    source: 'Marcus Aurelius, Meditations 10:6',
  },
  {
    key: 'sphere_sovereignty',
    title: 'Sphere Sovereignty',
    description: 'Distinguish what you control (your intentions, judgments, character, responses) from what you don\'t (outcomes, others\' choices, externals). Focus energy only within your sphere.',
    integrates: 'Dichotomy of Control + Intention Over Outcome',
    source: 'Epictetus, Enchiridion 1',
  },
  {
    key: 'virtuous_response',
    title: 'Virtuous Response',
    description: 'In every situation, ask "What does wisdom, courage, justice, or temperance require here?" View obstacles as opportunities for practicing virtue.',
    integrates: 'Virtuous Reappraisal + Negative Visualization + Character Cultivation',
    source: 'Marcus Aurelius, Meditations 5:20',
  },
  {
    key: 'interconnected_living',
    title: 'Interconnected Living',
    description: 'Bring full presence to others. Recognize that we\'re all members of one human community. Act for the common good, not just personal benefit.',
    integrates: 'Relational Presence + Interconnected Action + Contemplative Praxis',
    source: 'Marcus Aurelius, Meditations 8:59',
  },
];

/**
 * Get principle info by key
 */
export const getPrincipleByKey = (key: StoicPrinciple): PrincipleInfo | undefined => {
  return PRINCIPLES.find(p => p.key === key);
};

/**
 * Get principle title by key (for display purposes)
 */
export const getPrincipleTitle = (key: StoicPrinciple): string => {
  return getPrincipleByKey(key)?.title ?? key;
};
