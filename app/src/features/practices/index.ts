/**
 * Daily Practices Feature - Public API
 *
 * Domain Authority: philosopher (CRITICAL)
 * Stoic Mindfulness practices for morning, midday, and evening rituals
 *
 * This feature manages the three daily practice flows that guide users
 * through Stoic Mindfulness exercises at different times of day.
 */

// Practice Flows
export { default as MorningFlowNavigator } from './morning/MorningFlowNavigator';
export { default as MiddayFlowNavigator } from './midday/MiddayFlowNavigator';
export { default as EveningFlowNavigator } from './evening/EveningFlowNavigator';

// Shared Components
export * from './shared/components';
