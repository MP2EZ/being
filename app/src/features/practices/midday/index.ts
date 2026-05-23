/**
 * Midday Flow Export Index - MAINT-65
 * Stoic Mindfulness Midday Flow (Refactored 4-Screen)
 *
 * MAINT-65: Refactored from 5 screens to 4 screens
 * - PauseAcknowledge (Aware Presence)
 * - RealityCheck (Radical Acceptance + Sphere Sovereignty)
 * - VirtueResponse (Virtuous Response)
 * - CompassionateClose (Interconnected Living)
 */

export { default as MiddayFlowNavigator } from './MiddayFlowNavigator';
export type { MiddayFlowParamList, StoicMiddayFlowData } from '@/features/practices/types/flows';

// MAINT-65: New 4-Screen Flow
export { default as PauseAcknowledgeScreen } from './screens/PauseAcknowledgeScreen';
export { default as RealityCheckScreen } from './screens/RealityCheckScreen';
export { default as VirtueResponseScreen } from './screens/VirtueResponseScreen';
export { default as CompassionateCloseScreen } from './screens/CompassionateCloseScreen';

// Legacy screens (deprecated - kept for backward compatibility)
// These screens are no longer used by MiddayFlowNavigator
// @deprecated Use the new 4-screen flow instead
