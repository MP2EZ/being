/**
 * Morning Flow Export Index - FEAT-139 UX Refactor
 * Clean imports for Stoic Mindfulness morning flow
 *
 * 4-screen flow: GroundedPresence → GratitudeIntention → PrincipleFocus → RelationalClose
 * Philosopher validated (9/10) - All 5 Stoic Mindfulness principles represented
 */

// Navigator
export { default as MorningFlowNavigator } from './MorningFlowNavigator';

// FEAT-139 Screens (4-screen flow)
export { default as GroundedPresenceScreen } from './screens/GroundedPresenceScreen';
export { default as GratitudeIntentionScreen } from './screens/GratitudeIntentionScreen';
export { default as PrincipleFocusScreen } from './screens/PrincipleFocusScreen';
export { default as RelationalCloseScreen } from './screens/RelationalCloseScreen';
export { default as MorningCompletionScreen } from './screens/MorningCompletionScreen';

// Data types
export type { GroundedPresenceData } from './screens/GroundedPresenceScreen';
export type { GratitudeIntentionData } from './screens/GratitudeIntentionScreen';
export type { RelationalCloseData } from './screens/RelationalCloseScreen';
