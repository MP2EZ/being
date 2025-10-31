/**
 * THERAPEUTIC VALUES CONSTANTS - DEPRECATED (FEAT-51)
 *
 * ⚠️ DEPRECATION NOTICE:
 * This file is deprecated as of FEAT-51 (Virtue Tracking Dashboard).
 * The therapeutic values system has been replaced by the Stoic Mindfulness framework
 * with 4 cardinal virtues (wisdom, courage, justice, temperance).
 *
 * This file is retained for backward compatibility with existing user data,
 * but no UI exists to manage these values anymore.
 *
 * Migration: None required - existing values data remains in storage but is no longer
 * accessible or editable. New users will use the Stoic framework exclusively.
 *
 * ORIGINAL PURPOSE:
 * - 15 MBCT-aligned therapeutic values (qualities/principles)
 * - Users selected 3-5 values during onboarding
 * - Values were viewable and editable in profile
 *
 * REPLACED BY:
 * - /src/types/stoic.ts - Stoic Mindfulness type definitions
 * - /src/stores/stoicPracticeStore.ts - Virtue tracking store
 * - See /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 *
 * @deprecated Use Stoic Mindfulness framework instead (4 virtues + 5 principles)
 */

import { PHIClassification } from '../types/compliance/hipaa';

// Data minimization status (from HIPAA compliance requirements)
type DataMinimizationStatus = 'necessary' | 'optional' | 'excessive' | 'prohibited';

export interface TherapeuticValue {
  id: string;
  label: string;
  description: string;
  phiClassification: PHIClassification;
  dataMinimization: DataMinimizationStatus;
}

/**
 * 15 MBCT-aligned therapeutic values
 * Users select 3-5 during onboarding
 */
export const THERAPEUTIC_VALUES: TherapeuticValue[] = [
  { id: 'compassion', label: 'Compassion', description: 'Kindness toward yourself and others', phiClassification: 'therapeutic_preference', dataMinimization: 'necessary' },
  { id: 'growth', label: 'Growth', description: 'Learning and evolving through experiences', phiClassification: 'therapeutic_preference', dataMinimization: 'necessary' },
  { id: 'connection', label: 'Connection', description: 'Meaningful relationships with others', phiClassification: 'therapeutic_preference', dataMinimization: 'necessary' },
  { id: 'mindfulness', label: 'Mindfulness', description: 'Present-moment awareness', phiClassification: 'therapeutic_preference', dataMinimization: 'necessary' },
  { id: 'acceptance', label: 'Acceptance', description: 'Embracing what is, as it is', phiClassification: 'therapeutic_preference', dataMinimization: 'necessary' },
  { id: 'presence', label: 'Presence', description: 'Being fully here and now', phiClassification: 'therapeutic_preference', dataMinimization: 'necessary' },
  { id: 'kindness', label: 'Kindness', description: 'Gentle, caring actions and thoughts', phiClassification: 'therapeutic_preference', dataMinimization: 'necessary' },
  { id: 'resilience', label: 'Resilience', description: 'Bouncing back from challenges', phiClassification: 'therapeutic_preference', dataMinimization: 'necessary' },
  { id: 'authenticity', label: 'Authenticity', description: 'Being true to yourself', phiClassification: 'therapeutic_preference', dataMinimization: 'necessary' },
  { id: 'peace', label: 'Peace', description: 'Inner calm and tranquility', phiClassification: 'therapeutic_preference', dataMinimization: 'necessary' },
  { id: 'gratitude', label: 'Gratitude', description: 'Appreciation for what you have', phiClassification: 'therapeutic_preference', dataMinimization: 'necessary' },
  { id: 'wisdom', label: 'Wisdom', description: 'Deep understanding and insight', phiClassification: 'therapeutic_preference', dataMinimization: 'necessary' },
  { id: 'courage', label: 'Courage', description: 'Facing challenges with strength', phiClassification: 'therapeutic_preference', dataMinimization: 'necessary' },
  { id: 'balance', label: 'Balance', description: 'Harmony in all aspects of life', phiClassification: 'therapeutic_preference', dataMinimization: 'necessary' },
  { id: 'understanding', label: 'Understanding', description: 'Compassionate awareness of others', phiClassification: 'therapeutic_preference', dataMinimization: 'necessary' },
];

/**
 * Validation constants
 * From onboarding requirements
 */
export const MIN_VALUES_SELECTION = 3;
export const MAX_VALUES_SELECTION = 5;

/**
 * Get value by ID
 */
export function getValueById(id: string): TherapeuticValue | undefined {
  return THERAPEUTIC_VALUES.find(v => v.id === id);
}

/**
 * Validate values selection
 */
export function validateValuesSelection(selectedIds: string[]): boolean {
  return (
    selectedIds.length >= MIN_VALUES_SELECTION &&
    selectedIds.length <= MAX_VALUES_SELECTION &&
    selectedIds.every(id => THERAPEUTIC_VALUES.some(v => v.id === id))
  );
}
